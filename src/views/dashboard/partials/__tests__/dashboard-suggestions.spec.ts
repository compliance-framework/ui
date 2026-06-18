import { describe, expect, it } from 'vitest';
import {
  buildLabelFilter,
  computeGroupEditDiff,
  type DashboardSuggestion,
} from '../dashboard-suggestions';

describe('buildLabelFilter', () => {
  it('returns undefined when there are no valid conditions', () => {
    expect(buildLabelFilter([])).toBeUndefined();
    expect(buildLabelFilter([{ key: '', value: 'x' }])).toBeUndefined();
    expect(buildLabelFilter([{ key: 'env', value: '  ' }])).toBeUndefined();
  });

  it('collapses a single condition to a bare scope.condition', () => {
    expect(buildLabelFilter([{ key: 'env', value: 'prod' }])).toEqual({
      scope: { condition: { label: 'env', operator: '=', value: 'prod' } },
    });
  });

  it('AND-joins multiple conditions under a scope.query', () => {
    expect(
      buildLabelFilter([
        { key: 'env', value: 'prod' },
        { key: 'provider', value: 'aws' },
      ]),
    ).toEqual({
      scope: {
        query: {
          operator: 'AND',
          scopes: [
            { condition: { label: 'env', operator: '=', value: 'prod' } },
            { condition: { label: 'provider', operator: '=', value: 'aws' } },
          ],
        },
      },
    });
  });
});

function suggestion(
  overrides: Partial<DashboardSuggestion>,
): DashboardSuggestion {
  return {
    id: overrides.id ?? 'id',
    status: 'pending',
    controlId: overrides.controlId ?? 'AC-1',
    labelSetHash: 'hash',
    ...overrides,
  };
}

describe('computeGroupEditDiff', () => {
  it('returns all unchanged chips and no diff for an un-edited group', () => {
    const diff = computeGroupEditDiff(
      [
        suggestion({
          proposedFilterName: 'AI',
          proposedFilterLabelSet: { env: 'prod' },
        }),
      ],
      { env: 'prod' },
    );
    expect(diff.edited).toBe(false);
    expect(diff.labelChips).toEqual([{ text: 'env=prod', kind: 'unchanged' }]);
    expect(diff.titleTo).toBeUndefined();
    expect(diff.addedControlIds).toEqual([]);
    expect(diff.removedControlIds).toEqual([]);
  });

  it('marks added, removed and changed labels and the title change', () => {
    const kept = suggestion({
      id: 'k',
      isUserEdited: true,
      proposedFilterName: 'User title',
      originalProposedFilterName: 'AI title',
      proposedFilterLabelSet: { env: 'staging', team: 'payments' },
      originalProposedFilterLabelSet: { env: 'prod', repo: 'payments-api' },
      removedControlIds: ['AC-2'],
    });
    const added = suggestion({
      id: 'a',
      controlId: 'AC-3',
      isUserEdited: true,
      addedByUser: true,
      proposedFilterLabelSet: { env: 'staging', team: 'payments' },
    });

    const diff = computeGroupEditDiff([kept, added], {
      env: 'staging',
      team: 'payments',
    });

    expect(diff.edited).toBe(true);
    expect(diff.titleFrom).toBe('AI title');
    expect(diff.titleTo).toBe('User title');
    expect(diff.addedControlIds).toEqual(['AC-3']);
    expect(diff.removedControlIds).toEqual(['AC-2']);
    // env=prod -> env=staging (changed: red old + green new); repo removed (red);
    // team added (green).
    expect(diff.labelChips).toEqual([
      { text: 'env=prod', kind: 'removed' },
      { text: 'env=staging', kind: 'added' },
      { text: 'repo=payments-api', kind: 'removed' },
      { text: 'team=payments', kind: 'added' },
    ]);
  });
});
