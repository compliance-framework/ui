// A paginated instance list: the picker shows one page of instances at a time, and the header
// says when the loaded rows are only part of the fleet.
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import type { AgentInstanceSummary } from '@/types/agent-config';
import { instancesMixed } from '@/composables/agent-config/__tests__/fixtures';
import {
  deriveInstanceState,
  summarizeSync,
} from '@/utils/agent-config/instance-status';
import AgentInstancePicker from '../AgentInstancePicker.vue';
import AgentConfigHeader from '../AgentConfigHeader.vue';
import { READER, globalWith, piniaWith } from './helpers';

function rows(n: number, over: Partial<AgentInstanceSummary> = {}) {
  return Array.from({ length: n }, (_, i) => ({
    ...instancesMixed.items[0],
    instanceId: `i${i + 1}`,
    hostname: `ip-${i + 1}`,
    ...over,
  }));
}

function picker(instances: AgentInstanceSummary[], selectedId: string | null) {
  return mount(AgentInstancePicker, {
    props: {
      instances,
      states: instances.map((i) => deriveInstanceState(i, 7)),
      selectedId,
    },
    global: globalWith(piniaWith(READER)),
  });
}

const picks = (w: ReturnType<typeof picker>) =>
  w.findAll('[data-test^="pick-"]').map((b) => b.attributes('data-test'));

describe('AgentInstancePicker paging', () => {
  it('renders one page of 25 instances and pages through the rest', async () => {
    const w = picker(rows(60), 'i1');
    expect(picks(w)).toHaveLength(25);
    expect(picks(w)[0]).toBe('pick-i1');
    expect(w.find('[data-test="picker-range"]').text()).toBe('1–25 of 60');
    expect(w.find('[data-test="picker-prev"]').attributes('disabled')).toBe('');
    await w.find('[data-test="picker-next"]').trigger('click');
    await w.find('[data-test="picker-next"]').trigger('click');
    expect(picks(w)).toEqual(
      Array.from({ length: 10 }, (_, i) => `pick-i${i + 51}`),
    );
    expect(w.find('[data-test="picker-next"]').attributes('disabled')).toBe('');
  });

  it('opens on the page of the selected instance', () => {
    const w = picker(rows(60), 'i40');
    expect(w.find('[data-test="picker-range"]').text()).toBe('26–50 of 60');
    expect(w.find('[data-test="pick-i40"]').exists()).toBe(true);
  });

  it('a short list has no pager', () => {
    const w = picker(rows(3), 'i1');
    expect(picks(w)).toHaveLength(3);
    expect(w.find('[data-test="picker-pager"]').exists()).toBe(false);
  });

  it('stale instances join the pages when shown', async () => {
    const list = [
      ...rows(24),
      ...rows(3, { stale: true }).map((r, i) => ({
        ...r,
        instanceId: `s${i + 1}`,
      })),
    ];
    const w = picker(list, 'i1');
    expect(picks(w)).toHaveLength(24);
    await w.find('[data-test="toggle-stale"]').trigger('click');
    expect(picks(w)).toHaveLength(25);
    await w.find('[data-test="picker-next"]').trigger('click');
    expect(picks(w)).toEqual(['pick-s2', 'pick-s3']);
  });
});

describe('AgentConfigHeader on part of the fleet', () => {
  function header(loaded: AgentInstanceSummary[], total: number) {
    const counts = { ...instancesMixed.meta.counts, total };
    return mount(AgentConfigHeader, {
      props: {
        config: null,
        instanceCount: total,
        syncSummary: summarizeSync(
          loaded,
          loaded.map((i) => deriveInstanceState(i, 7)),
          counts,
        ),
      },
      global: globalWith(piniaWith(READER)),
    });
  }

  it('says the loaded rows are part of the fleet, with fleet-wide counts', () => {
    const w = header(rows(100), 130);
    expect(w.find('[data-test="sync-summary"]').text()).toContain(
      'In sync: 3/5 instances',
    );
    expect(w.find('[data-test="partial-fleet"]').text()).toContain(
      'Showing 100 of 130 instances',
    );
  });

  it('says nothing more when every instance is loaded', () => {
    const w = header(instancesMixed.items, 7);
    expect(w.find('[data-test="sync-summary"]').exists()).toBe(true);
    expect(w.find('[data-test="partial-fleet"]').exists()).toBe(false);
  });
});
