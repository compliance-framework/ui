import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import type { StepExecution } from '@/types/workflows';
import RunStepsTable from '../RunStepsTable.vue';
import { formatDuration } from '../runDuration';

const step = (overrides: Partial<StepExecution>) =>
  ({
    id: 's',
    status: 'pending',
    evidence: [],
    ...overrides,
  }) as StepExecution;

describe('RunStepsTable', () => {
  it('lists steps in order with status, notes, duration and Open', async () => {
    const steps = [
      step({
        id: 's2',
        status: 'failed',
        failureReason: 'Scanner offline',
        workflowStepDefinition: { id: 'd2', name: 'Scan', order: 2 } as never,
      }),
      step({
        id: 's1',
        status: 'completed',
        completedAt: '2026-11-01T10:00:00Z',
        evidence: [{ id: 'e1' } as never],
        workflowStepDefinition: {
          id: 'd1',
          name: 'Prepare',
          order: 1,
          responsibleRole: 'IAM Administrator',
        } as never,
      }),
    ];
    let opened: unknown;
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(TooltipProvider, null, () =>
            h(RunStepsTable, {
              steps,
              metrics: {
                executionId: 'x',
                stepMetrics: [
                  {
                    stepDefinitionId: 'd1',
                    stepName: 'Prepare',
                    durationMinutes: 125,
                  },
                ],
              },
              onOpen: (s: unknown) => (opened = s),
            }),
          ),
      }),
    );
    const rows = wrapper.findAll('tbody tr');
    expect(rows[0]!.text()).toContain('Prepare');
    expect(rows[0]!.text()).toContain('IAM Administrator');
    expect(rows[0]!.text()).toContain('2h 5m');
    expect(rows[0]!.text()).toContain('1 item');
    expect(rows[1]!.text()).toContain('Failed: Scanner offline');
    await rows[1]!.find('button').trigger('click');
    expect((opened as StepExecution).id).toBe('s2');
  });

  it('formats durations', () => {
    expect(formatDuration(undefined)).toBe('Not recorded');
    expect(formatDuration(45.4)).toBe('45m');
    expect(formatDuration(120)).toBe('2h');
  });
});
