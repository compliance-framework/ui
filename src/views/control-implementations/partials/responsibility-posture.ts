import type { StatusKey } from '@/ds/components/StatusBadge/statuses';
import type {
  LeveragedControl,
  ResponsibilityPostureValue,
  SSPLeverageSatisfaction,
} from '@/types/ssp-leverage';
import type { Statement } from '@/oscal';

// Plain-language rendering of the live, evidence-backed responsibility posture
// (leveraged-controls' responsibilityPosture) — no OSCAL vocabulary in the UI.

export function postureLabel(value?: ResponsibilityPostureValue): string {
  switch (value) {
    case 'satisfied':
      return 'Covered';
    case 'not-satisfied':
      return 'Not covered';
    default:
      return 'No evidence yet';
  }
}

/** Whether evidence covers one inherited responsibility, as a status badge. */
export function responsibilityBadge(value?: ResponsibilityPostureValue): {
  status: StatusKey;
  label: string;
} {
  if (value === 'satisfied') return { status: 'satisfied', label: 'Covered' };
  if (value === 'not-satisfied')
    return { status: 'not-satisfied', label: 'Not covered' };
  return { status: 'unknown', label: 'No evidence yet' };
}

export function satisfactionLabel(value: SSPLeverageSatisfaction): string {
  return value === 'full' ? 'Implemented' : 'Action needed';
}

/** How fully an inherited capability is implemented downstream, as a status badge. */
export function satisfactionBadge(value: SSPLeverageSatisfaction): {
  status: StatusKey;
  label?: string;
} {
  return value === 'full'
    ? { status: 'implemented' }
    : { status: 'needs-evidence', label: 'Action needed' };
}

export interface InheritedResponsibilityRow {
  responsibilityUuid: string;
  description: string;
  posture?: ResponsibilityPostureValue;
  // The downstream satisfied entry covering this responsibility, when one exists —
  // authored via "How we handle this" (or picked at import time).
  satisfiedUuid?: string;
  satisfiedDescription?: string;
}

// The full responsibility set for one leverage link, with descriptions resolved. Posture
// keys carry the COMPLETE upstream set. The responsibility's own text comes from the
// upstream set (`responsibilities`, falling back to `outstandingResponsibilities` for older
// payloads) — NEVER from a satisfied entry, whose description is the downstream's "how we
// handle this" note, surfaced separately as `satisfiedDescription`.
export function inheritedResponsibilityRows(
  link: LeveragedControl,
  statement?: Statement,
): InheritedResponsibilityRow[] {
  const descriptions = new Map<string, string>();
  const satisfied = new Map<string, { uuid: string; description: string }>();

  // The full upstream set is authoritative; outstanding is a subset, used only to
  // back-fill descriptions when `responsibilities` is absent.
  for (const responsibility of link.responsibilities ?? []) {
    descriptions.set(
      responsibility.responsibilityUuid,
      responsibility.description,
    );
  }
  for (const outstanding of link.outstandingResponsibilities ?? []) {
    if (!descriptions.has(outstanding.responsibilityUuid)) {
      descriptions.set(outstanding.responsibilityUuid, outstanding.description);
    }
  }
  for (const byComponent of statement?.byComponents ?? []) {
    for (const entry of byComponent.satisfied ?? []) {
      if (!entry.responsibilityUuid) continue;
      satisfied.set(entry.responsibilityUuid, {
        uuid: entry.uuid,
        description: entry.description,
      });
    }
  }

  const uuids = new Set<string>([
    ...Object.keys(link.responsibilityPosture ?? {}),
    ...(link.responsibilities ?? []).map((r) => r.responsibilityUuid),
    ...(link.outstandingResponsibilities ?? []).map(
      (r) => r.responsibilityUuid,
    ),
  ]);

  return [...uuids].map((responsibilityUuid) => ({
    responsibilityUuid,
    description:
      descriptions.get(responsibilityUuid) ?? 'Inherited responsibility',
    posture: link.responsibilityPosture?.[responsibilityUuid],
    satisfiedUuid: satisfied.get(responsibilityUuid)?.uuid,
    satisfiedDescription: satisfied.get(responsibilityUuid)?.description,
  }));
}
