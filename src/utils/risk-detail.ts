import type { Risk, RiskLogEntry } from '@/oscal';

export type RiskAssociationKind = 'evidence' | 'controls' | 'components';

export interface RiskAssociationItem {
  id: string;
  evidenceId?: string;
  evidenceUuid?: string;
  title: string;
  description?: string;
  type?: string;
  catalogName?: string;
  controlId?: string;
  start?: string;
  end?: string;
}

export interface RiskEventItem {
  id: string;
  type: string;
  timestamp?: string;
  actor?: string;
  details?: string;
}

type LooseRecord = Record<string, unknown>;
type LooseRisk = Risk & LooseRecord;

interface AssociationConfig {
  fields: string[];
  persistenceFields: string[];
  idsField: string;
  idKeys: string[];
  titleKeys: string[];
  descriptionKeys?: string[];
  typeKeys?: string[];
  catalogKeys?: string[];
  startKeys?: string[];
  endKeys?: string[];
}

const ASSOCIATION_CONFIG: Record<RiskAssociationKind, AssociationConfig> = {
  evidence: {
    fields: ['evidenceIds', 'relatedEvidence', 'evidence', 'evidenceItems'],
    persistenceFields: ['relatedEvidence', 'evidence'],
    idsField: 'evidenceIds',
    idKeys: ['evidenceId', 'id', 'evidenceUuid', 'uuid'],
    titleKeys: ['title', 'name', 'id', 'uuid'],
    descriptionKeys: ['description', 'remarks'],
    startKeys: ['start', 'startDate', 'collected'],
    endKeys: ['end', 'endDate', 'expires'],
  },
  controls: {
    fields: ['controlIds', 'relatedControls', 'controls', 'controlItems'],
    persistenceFields: ['relatedControls', 'controls'],
    idsField: 'controlIds',
    idKeys: ['controlId', 'id', 'uuid'],
    titleKeys: ['title', 'name', 'label', 'controlId'],
    descriptionKeys: ['description', 'remarks'],
    catalogKeys: ['catalogName', 'catalog', 'catalogId'],
  },
  components: {
    fields: [
      'componentIds',
      'relatedComponents',
      'components',
      'componentItems',
    ],
    persistenceFields: ['relatedComponents', 'components'],
    idsField: 'componentIds',
    idKeys: ['componentUuid', 'componentId', 'id', 'uuid'],
    titleKeys: ['title', 'name', 'label', 'componentUuid', 'id'],
    descriptionKeys: ['description', 'remarks'],
    typeKeys: ['type'],
  },
};

function toRecord(value: unknown): LooseRecord | null {
  if (!value || typeof value !== 'object') return null;
  return value as LooseRecord;
}

function readString(record: LooseRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function normalizeCandidate(
  candidate: unknown,
  config: AssociationConfig,
): RiskAssociationItem | null {
  if (typeof candidate === 'string') {
    const id = candidate.trim();
    if (!id) return null;
    return { id, title: id };
  }

  const record = toRecord(candidate);
  if (!record) return null;

  const id = readString(record, config.idKeys);
  if (!id) return null;

  const title = readString(record, config.titleKeys) || id;

  const normalized: RiskAssociationItem = {
    id,
    title,
    description: config.descriptionKeys
      ? readString(record, config.descriptionKeys)
      : undefined,
    type: config.typeKeys ? readString(record, config.typeKeys) : undefined,
    catalogName: config.catalogKeys
      ? readString(record, config.catalogKeys)
      : undefined,
    controlId:
      config === ASSOCIATION_CONFIG.controls
        ? readString(record, ['controlId'])
        : undefined,
    start: config.startKeys ? readString(record, config.startKeys) : undefined,
    end: config.endKeys ? readString(record, config.endKeys) : undefined,
  };

  if (config === ASSOCIATION_CONFIG.evidence) {
    const explicitEvidenceId = readString(record, ['evidenceId', 'id']);
    if (explicitEvidenceId) {
      normalized.evidenceId = explicitEvidenceId;
    }

    const evidenceUuid = readString(record, ['evidenceUuid', 'uuid']);
    if (evidenceUuid) {
      normalized.evidenceUuid = evidenceUuid;
    }
  }

  return normalized;
}

function normalizeAssociationArray(
  value: unknown,
  config: AssociationConfig,
): RiskAssociationItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => normalizeCandidate(entry, config))
    .filter((entry): entry is RiskAssociationItem => !!entry);
}

function normalizeForPersistence(
  kind: RiskAssociationKind,
  items: RiskAssociationItem[],
): LooseRecord[] {
  switch (kind) {
    case 'evidence':
      return items.map((item) => ({
        evidenceId:
          item.evidenceId || (!item.evidenceUuid ? item.id : undefined),
        evidenceUuid: item.evidenceUuid || undefined,
        title: item.title,
        description: item.description,
        start: item.start,
        end: item.end,
      }));
    case 'controls':
      return items.map((item) => ({
        controlId: item.controlId || item.id,
        title: item.title,
        catalogName: item.catalogName,
        description: item.description,
      }));
    case 'components':
      return items.map((item) => ({
        componentUuid: item.id,
        title: item.title,
        type: item.type,
        description: item.description,
      }));
    default:
      return [];
  }
}

function collectAssociationIds(
  kind: RiskAssociationKind,
  items: RiskAssociationItem[],
): string[] {
  const ids = new Set<string>();

  items.forEach((item) => {
    let id = '';

    switch (kind) {
      case 'evidence':
        id = item.evidenceId || item.evidenceUuid || item.id;
        break;
      case 'controls':
        id = item.controlId || item.id;
        break;
      case 'components':
        id = item.id;
        break;
    }

    if (id) {
      ids.add(id);
    }
  });

  return Array.from(ids);
}

function pickExistingField(risk: LooseRisk, fields: string[]): string {
  for (const field of fields) {
    if (Array.isArray(risk[field])) {
      return field;
    }
  }
  return fields[0];
}

export function getRiskAssociations(
  risk: Risk | null | undefined,
  kind: RiskAssociationKind,
): RiskAssociationItem[] {
  if (!risk) return [];
  const config = ASSOCIATION_CONFIG[kind];
  const source = risk as LooseRisk;
  const items: RiskAssociationItem[] = [];
  const seen = new Set<string>();

  config.fields.forEach((field) => {
    normalizeAssociationArray(source[field], config).forEach((item) => {
      const key =
        kind === 'evidence'
          ? item.evidenceUuid || item.evidenceId || item.id
          : item.controlId || item.id;
      if (seen.has(key)) return;
      seen.add(key);
      items.push(item);
    });
  });

  return items;
}

export function withUpdatedRiskAssociations(
  risk: Risk,
  kind: RiskAssociationKind,
  items: RiskAssociationItem[],
): Risk {
  const config = ASSOCIATION_CONFIG[kind];
  const source = risk as LooseRisk;
  const targetField = pickExistingField(source, config.persistenceFields);
  const normalized = normalizeForPersistence(kind, items);
  const ids = collectAssociationIds(kind, items);

  return {
    ...(risk as LooseRisk),
    [targetField]: normalized,
    [config.idsField]: ids,
  } as Risk;
}

function stringifyActor(actor: unknown): string | undefined {
  if (typeof actor === 'string') return actor.trim() || undefined;
  const record = toRecord(actor);
  if (!record) return undefined;
  return (
    readString(record, ['displayName', 'name', 'email']) ||
    readString(record, ['id', 'uuid', 'actorUuid', 'partyUuid'])
  );
}

function normalizeEvent(input: unknown): RiskEventItem | null {
  if (!input || typeof input !== 'object') return null;
  const record = input as LooseRecord;

  const id =
    readString(record, ['uuid', 'id', 'eventId']) || crypto.randomUUID();
  const type =
    readString(record, [
      'type',
      'eventType',
      'action',
      'statusChange',
      'title',
    ]) || 'Event';
  const timestamp = readString(record, [
    'timestamp',
    'createdAt',
    'created',
    'date',
    'time',
    'start',
  ]);
  const actor =
    stringifyActor(record.actor) ||
    stringifyActor(record.user) ||
    stringifyActor(record.loggedBy) ||
    readString(record, ['actorName', 'actorUuid', 'partyUuid']);
  const details =
    readString(record, ['details', 'description', 'message', 'remarks']) ||
    readString(record, ['title']);

  return {
    id,
    type,
    timestamp,
    actor,
    details,
  };
}

function normalizeFromRiskLogEntry(entry: RiskLogEntry): RiskEventItem {
  const actor = entry.loggedBy
    ?.map((actorItem) => actorItem.partyUuid)
    .filter(Boolean)
    .join(', ');

  return {
    id: entry.uuid || crypto.randomUUID(),
    type: entry.statusChange || entry.title || 'Log Event',
    timestamp: entry.start || entry.end,
    actor: actor || undefined,
    details: entry.description || entry.remarks || entry.title,
  };
}

function resolveRawEvents(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  const record = toRecord(input);
  if (!record) return [];

  if (Array.isArray(record.events)) return record.events;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.data)) return record.data;
  return [];
}

export function normalizeRiskEvents(
  rawEvents: unknown,
  fallbackLogEntries?: RiskLogEntry[],
): RiskEventItem[] {
  const normalized = resolveRawEvents(rawEvents)
    .map((event) => normalizeEvent(event))
    .filter((event): event is RiskEventItem => !!event);

  if (!normalized.length && fallbackLogEntries?.length) {
    return [...fallbackLogEntries]
      .map((entry) => normalizeFromRiskLogEntry(entry))
      .sort((left, right) =>
        (right.timestamp || '').localeCompare(left.timestamp || ''),
      );
  }

  return normalized.sort((left, right) =>
    (right.timestamp || '').localeCompare(left.timestamp || ''),
  );
}
