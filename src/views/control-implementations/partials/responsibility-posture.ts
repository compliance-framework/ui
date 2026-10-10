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

export function postureSeverity(
  value?: ResponsibilityPostureValue,
): 'success' | 'danger' | 'secondary' {
  switch (value) {
    case 'satisfied':
      return 'success';
    case 'not-satisfied':
      return 'danger';
    default:
      return 'secondary';
  }
}

export function satisfactionLabel(value: SSPLeverageSatisfaction): string {
  return value === 'full' ? 'Implemented' : 'Action needed';
}

export function satisfactionSeverity(
  value: SSPLeverageSatisfaction,
): 'success' | 'warn' {
  return value === 'full' ? 'success' : 'warn';
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
