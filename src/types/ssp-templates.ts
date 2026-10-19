import {
  FilterParser,
  serializeFilter,
  type Filter,
} from '@/parsers/labelfilter';

// SSP templates (admin): a template turns every distinct combination of its key label values
// in the latest evidence into one SSP and keeps that SSP's scope up to date.
//
// The admin API is kebab-case (`/api/admin/ssp-templates`): request bodies go out through
// `decamelizeKeys` and responses arrive camelCased by the global interceptor. `keys` and
// `scopeLabels` are string arrays, so neither conversion touches a label key.

// The API's validation limits, mirrored so the form can explain them before saving.
export const SSP_TEMPLATE_MAX_KEYS = 5;
export const SSP_TEMPLATE_MAX_SCOPE_LABEL_GROUPS = 10;
export const SSP_TEMPLATE_MAX_LABELS_PER_GROUP = 5;

export interface SspTemplateProp {
  name: string;
  value: string;
}

export interface SspTemplate {
  id: string;
  name: string;
  enabled: boolean;
  keys: string[];
  filter?: Filter | null;
  scopeLabels?: string[][] | null;
  minStreams: number;
  titleTemplate: string;
  descriptionTemplate?: string | null;
  props?: SspTemplateProp[] | null;
  profileIds?: string[] | null;
  createdAt: string;
  updatedAt: string;
  // Not in the design's contract yet: shown in the list when the API returns them.
  sspCount?: number | null;
  lastRunAt?: string | null;
}

export interface UpsertSspTemplateRequest {
  name: string;
  enabled: boolean;
  keys: string[];
  // null clears a saved filter on update.
  filter: Filter | null;
  scopeLabels: string[][];
  minStreams: number;
  titleTemplate: string;
  descriptionTemplate?: string;
  props: SspTemplateProp[];
  profileIds: string[];
}

export interface SspTemplateFormData {
  name: string;
  enabled: boolean;
  keys: string[];
  // Free text in the label filter syntax, e.g. `auto_create_ssp=true AND env!=dev`.
  filter: string;
  scopeLabels: string[][];
  // A number input may hand back a string (or '' when cleared); parsed on submit.
  minStreams: number | string;
  titleTemplate: string;
  descriptionTemplate: string;
  props: SspTemplateProp[];
  profileIds: string[];
}

export function createEmptySspTemplateForm(): SspTemplateFormData {
  return {
    name: '',
    enabled: true,
    keys: [],
    filter: '',
    scopeLabels: [],
    minStreams: 1,
    titleTemplate: '',
    descriptionTemplate: '',
    props: [],
    profileIds: [],
  };
}

export function createSspTemplateFormFromTemplate(
  template: SspTemplate,
): SspTemplateFormData {
  return {
    name: template.name,
    enabled: template.enabled,
    keys: [...template.keys],
    filter: serializeFilter(template.filter),
    scopeLabels: (template.scopeLabels ?? []).map((group) => [...group]),
    minStreams: template.minStreams,
    titleTemplate: template.titleTemplate,
    descriptionTemplate: template.descriptionTemplate ?? '',
    props: (template.props ?? []).map((prop) => ({
      name: prop.name ?? '',
      value: prop.value ?? '',
    })),
    profileIds: [...(template.profileIds ?? [])],
  };
}

// Trims, drops empties and de-duplicates, keeping the first occurrence's order.
function normalizeLabels(labels: string[]): string[] {
  return [
    ...new Set(labels.map((label) => label.trim()).filter((label) => label)),
  ];
}

export function parseSspTemplateFilter(text: string): Filter | null {
  if (!text.trim()) {
    return null;
  }
  try {
    return new FilterParser(text).parse();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Filter is invalid: ${reason}`);
  }
}

function normalizeMinStreams(value: number | string): number {
  const raw = String(value ?? '').trim();
  const minStreams = raw === '' ? NaN : Number(raw);
  if (!Number.isInteger(minStreams) || minStreams < 1) {
    throw new Error('Minimum streams must be a whole number of at least 1.');
  }
  return minStreams;
}

function normalizeScopeLabels(groups: string[][]): string[][] {
  const normalized = groups
    .map(normalizeLabels)
    .filter((group) => group.length > 0);
  if (normalized.length > SSP_TEMPLATE_MAX_SCOPE_LABEL_GROUPS) {
    throw new Error(
      `At most ${SSP_TEMPLATE_MAX_SCOPE_LABEL_GROUPS} scope label groups are allowed.`,
    );
  }
  normalized.forEach((group, index) => {
    if (group.length > SSP_TEMPLATE_MAX_LABELS_PER_GROUP) {
      throw new Error(
        `Scope label group #${index + 1} has more than ${SSP_TEMPLATE_MAX_LABELS_PER_GROUP} labels.`,
      );
    }
  });
  return normalized;
}

function normalizeProps(props: SspTemplateProp[]): SspTemplateProp[] {
  const normalized: SspTemplateProp[] = [];
  props.forEach((prop, index) => {
    const name = prop.name.trim();
    const value = prop.value.trim();
    if (!name && !value) {
      return;
    }
    if (!name || !value) {
      throw new Error(
        `Property row #${index + 1} must include both name and value.`,
      );
    }
    normalized.push({ name, value });
  });
  return normalized;
}

export function buildUpsertSspTemplatePayload(
  form: SspTemplateFormData,
): UpsertSspTemplateRequest {
  const name = form.name.trim();
  if (!name) {
    throw new Error('Template name is required.');
  }

  const keys = normalizeLabels(form.keys);
  if (keys.length === 0) {
    throw new Error('At least one key label is required.');
  }
  if (keys.length > SSP_TEMPLATE_MAX_KEYS) {
    throw new Error(`At most ${SSP_TEMPLATE_MAX_KEYS} key labels are allowed.`);
  }

  const titleTemplate = form.titleTemplate.trim();
  if (!titleTemplate) {
    throw new Error('Title template is required.');
  }

  const descriptionTemplate = form.descriptionTemplate.trim();

  return {
    name,
    enabled: form.enabled,
    keys,
    filter: parseSspTemplateFilter(form.filter),
    scopeLabels: normalizeScopeLabels(form.scopeLabels),
    minStreams: normalizeMinStreams(form.minStreams),
    titleTemplate,
    descriptionTemplate: descriptionTemplate || undefined,
    props: normalizeProps(form.props),
    profileIds: [...new Set(form.profileIds)],
  };
}

export function formatSspTemplateDate(rawDate?: string | null): string {
  if (!rawDate) {
    return '-';
  }
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
}
