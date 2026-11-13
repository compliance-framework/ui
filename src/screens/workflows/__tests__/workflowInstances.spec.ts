import { describe, expect, it } from 'vitest';
import type { WorkflowDefinition } from '@/types/workflows';
import {
  applyDefinition,
  cadenceLabel,
  instancePayload,
  newDraft,
  readView,
  validateDraft,
  viewQuery,
} from '../workflowInstances';

const definition = (overrides: Partial<WorkflowDefinition> = {}) =>
  ({
    id: 'd1',
    name: 'Access review',
    evidenceRequired: '',
    ...overrides,
  }) as WorkflowDefinition;

describe('workflowInstances', () => {
  it('keeps definition, status and search in the URL', () => {
    const view = readView({
      definition: 'd1',
      status: 'inactive',
      q: ' review ',
    });
    expect(viewQuery(view)).toEqual({
      definition: 'd1',
      status: 'inactive',
      q: 'review',
    });
    expect(readView({ status: 'paused' }).status).toBe('');
  });

  it('describes cadences, including custom cron', () => {
    expect(cadenceLabel('on_demand')).toBe('On demand');
    expect(cadenceLabel('cron:0 0 9 * * 1')).toBe('Custom (0 0 9 * * 1)');
  });

  it("fills in a definition's suggestions", () => {
    const draft = applyDefinition(
      newDraft(),
      definition({ suggestedCadence: 'cron:0 0 9 * * 1', gracePeriodDays: 3 }),
    );
    expect(draft).toEqual(
      expect.objectContaining({
        name: 'Access review Instance',
        cadence: 'custom',
        cron: '0 0 9 * * 1',
        gracePeriod: '3',
      }),
    );
  });

  it('keeps a grace period the user changed, and a name they typed', () => {
    const typed = { ...newDraft(), name: 'Mine', gracePeriod: '14' };
    const draft = applyDefinition(typed, definition({ gracePeriodDays: 3 }));
    expect(draft.name).toBe('Mine');
    expect(draft.gracePeriod).toBe('14');
  });

  it('requires a definition, a name, a valid cron and a whole-number grace period', () => {
    expect(Object.keys(validateDraft(newDraft())).sort()).toEqual([
      'definition',
      'name',
    ]);
    const custom = {
      ...newDraft('d1'),
      name: 'x',
      cadence: 'custom',
      cron: 'nope',
      gracePeriod: '1.5',
    };
    expect(Object.keys(validateDraft(custom)).sort()).toEqual([
      'cron',
      'gracePeriod',
    ]);
  });

  it('builds the API body for the system', () => {
    const body = instancePayload(
      {
        ...newDraft('d1'),
        name: ' Weekly ',
        cadence: 'custom',
        cron: '0 0 9 * * 1',
      },
      'sys-1',
    );
    expect(body).toEqual({
      workflowDefinitionId: 'd1',
      name: 'Weekly',
      description: '',
      cadence: 'cron:0 0 9 * * 1',
      systemId: 'sys-1',
      gracePeriodDays: 7,
    });
  });
});
