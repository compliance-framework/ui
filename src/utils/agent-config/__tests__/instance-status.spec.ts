import { describe, expect, it } from 'vitest';
import type { AgentInstanceSummary } from '@/types/agent-config';
import { instancesMixed } from '@/composables/agent-config/fixtures';
import {
  deriveInstanceState,
  summarizeSync,
  validationInstanceIds,
} from '../instance-status';

const base = instancesMixed.items[0];
const inst = (over: Partial<AgentInstanceSummary>): AgentInstanceSummary => ({
  ...base,
  warnings: [],
  ...over,
});

describe('deriveInstanceState (U1.3 table)', () => {
  it.each<[string, Partial<AgentInstanceSummary>, string, string]>([
    ['row 1 unknown', { status: 'unknown' }, 'not-reported', 'No report'],
    [
      'row 1 no report',
      { reportedAt: null, status: 'applied' },
      'not-reported',
      'No report',
    ],
    [
      'row 2 not-applicable',
      { status: 'not-applicable' },
      'report-only',
      'Report only',
    ],
    [
      'row 2 report mode',
      { mode: 'report', status: 'applied' },
      'report-only',
      'Report only',
    ],
    [
      'row 3',
      { status: 'rejected', reason: 'unsafe-changes' },
      'rejected-unsafe',
      'Rejected r7: needs apply_all',
    ],
    [
      'row 4',
      { status: 'rejected', reason: 'forbidden-changes' },
      'rejected-forbidden',
      'Rejected r7: forbidden change',
    ],
    [
      'row 5',
      { status: 'rejected', reason: 'policy-errors' },
      'rejected-invalid',
      'Rejected r7',
    ],
    [
      'row 6',
      { status: 'failed', reason: 'download-failed' },
      'failed',
      'Failed r7',
    ],
    [
      'row 7',
      { status: 'pending', appliedRevision: 6 },
      'pending',
      'Pending r6 → r7',
    ],
    [
      'row 7 null applied',
      { status: 'pending', appliedRevision: null },
      'pending',
      'Pending r0 → r7',
    ],
    [
      'row 8',
      { status: 'applied', syncStatus: 'in-sync' },
      'in-sync',
      'In sync',
    ],
    [
      'row 9',
      { status: 'applied', syncStatus: 'out-of-sync', appliedRevision: 5 },
      'pending',
      'Pending r5 → r7',
    ],
    [
      'row 10',
      { status: 'applied', syncStatus: 'unknown' },
      'unknown',
      'Unknown',
    ],
  ])('%s', (_, over, state, chip) => {
    const s = deriveInstanceState(inst(over), 7);
    expect(s.state).toBe(state);
    expect(s.chipLabel).toBe(chip);
  });

  it('marks rows 3–6 attempted before the desired revision as "(older revision)"', () => {
    const s = deriveInstanceState(
      inst({ status: 'failed', attemptedRevision: 5 }),
      7,
    );
    expect(s.chipLabel).toBe('Failed r5 (older revision)');
    expect(s.olderRevision).toBe(true);
    expect(s.problem).toBe(true);
    const cur = deriveInstanceState(
      inst({ status: 'failed', attemptedRevision: 7 }),
      7,
    );
    expect(cur.olderRevision).toBe(false);
  });

  it('adds the extra badges', () => {
    const s = deriveInstanceState(
      inst({
        daemon: false,
        truncated: true,
        reportStale: true,
        warnings: [
          {
            path: '/plugins/a/schedule',
            message: 'bad',
            code: 'invalid-value',
          },
        ],
      }),
      7,
    );
    expect(s.badges.map((b) => b.key)).toEqual([
      'one-shot',
      'truncated',
      'report-stale',
      'file-warnings',
    ]);
    expect(s.badges[3].label).toBe('1 file warning');
    expect(deriveInstanceState(inst({}), 7).badges).toEqual([]);
  });
});

describe('summarizeSync', () => {
  it('counts fresh apply-mode instances and problems (fixture instancesMixed)', () => {
    const states = instancesMixed.items.map((i) => deriveInstanceState(i, 7));
    const s = summarizeSync(instancesMixed.items, states);
    // fresh apply-mode: a, b, f, g (d is stale, c report, e unknown mode '')
    expect(s.expected).toBe(4);
    expect(s.inSync).toBe(2);
    expect(s.reportOnly).toBe(1);
    expect(s.notReported).toBe(1);
    expect(s.stale).toBe(1);
    expect(s.problems.map((p) => p.hostname)).toEqual(['ip-b']);
  });
});

describe('validationInstanceIds (API ValidationBases)', () => {
  const i = (id: string, over: Partial<AgentInstanceSummary>) =>
    inst({ instanceId: id, ...over });
  it('uses fresh apply-mode instances with a report', () => {
    expect(validationInstanceIds(instancesMixed.items)).toEqual(
      instancesMixed.items
        .filter(
          (x) =>
            !x.stale &&
            (x.mode === 'apply_safe' || x.mode === 'apply_all') &&
            x.reportedAt,
        )
        .map((x) => x.instanceId),
    );
  });
  it('falls back to the latest reported apply-mode instance, else none', () => {
    const stale = [
      i('old', { stale: true, reportedAt: '2026-09-01T00:00:00Z' }),
      i('new', { stale: true, reportedAt: '2026-09-02T00:00:00Z' }),
      i('rep', { mode: 'report' }),
    ];
    expect(validationInstanceIds(stale)).toEqual(['new']);
    expect(validationInstanceIds([i('rep', { mode: 'report' })])).toEqual([]);
  });
});
