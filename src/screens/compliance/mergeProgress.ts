import type {
  ProfileComplianceControl,
  ProfileComplianceGroup,
  ProfileComplianceProgress,
} from '@/types/compliance';

/** As the API rounds: a whole percentage, 0 when there is nothing to count. */
function percent(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}

/**
 * Several profiles' compliance progress for one system as one: each control once (a control two
 * profiles include counts once; its status comes from the system's evidence, not the profile), with
 * the totals, groups and implementation coverage counted again from those controls the way the API
 * counts them. Needs each profile's controls (`includeControls`). One profile comes back as it is.
 */
export function mergeProgress(
  list: ProfileComplianceProgress[],
): ProfileComplianceProgress | undefined {
  if (list.length <= 1) return list[0];

  const byKey = new Map<string, ProfileComplianceControl>();
  for (const progress of list)
    for (const control of progress.controls ?? []) {
      const key = `${control.catalogId}:${control.controlId}`;
      if (!byKey.has(key)) byKey.set(key, control);
    }
  const controls = [...byKey.values()].sort(
    (a, b) =>
      (a.groupTitle ?? '').localeCompare(b.groupTitle ?? '') ||
      a.controlId.localeCompare(b.controlId) ||
      a.catalogId.localeCompare(b.catalogId),
  );

  const tally = { satisfied: 0, notSatisfied: 0, unknown: 0, inherited: 0 };
  const groups = new Map<string, ProfileComplianceGroup>();
  for (const control of controls) {
    const bucket =
      control.computedStatus === 'satisfied'
        ? 'satisfied'
        : control.computedStatus === 'not-satisfied'
          ? 'notSatisfied'
          : control.computedStatus === 'inherited'
            ? 'inherited'
            : 'unknown';
    tally[bucket]++;
    if (!control.groupId) continue;
    const group = groups.get(control.groupId) ?? {
      id: control.groupId,
      title: control.groupTitle ?? '',
      totalControls: 0,
      satisfied: 0,
      notSatisfied: 0,
      unknown: 0,
      inherited: 0,
      compliancePercent: 0,
    };
    group.totalControls++;
    group[bucket] = (group[bucket] ?? 0) + 1;
    groups.set(control.groupId, group);
  }
  for (const group of groups.values())
    group.compliancePercent = percent(
      group.satisfied + (group.inherited ?? 0),
      group.totalControls,
    );

  const total = controls.length;
  const withImplementation = list.every((p) => p.implementation);
  const implemented = controls.filter((c) => c.implemented).length;

  return {
    scope: list[0]!.scope,
    summary: {
      totalControls: total,
      ...tally,
      compliancePercent: percent(tally.satisfied + tally.inherited, total),
      assessedPercent: percent(
        tally.satisfied + tally.notSatisfied + tally.inherited,
        total,
      ),
      ...(withImplementation ? { implementedControls: implemented } : {}),
    },
    ...(withImplementation
      ? {
          implementation: {
            implementedControls: implemented,
            implementationPercent: percent(implemented, total),
            unimplementedControls: total - implemented,
          },
        }
      : {}),
    groups: [...groups.values()].sort(
      (a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
    ),
    controls,
  };
}
