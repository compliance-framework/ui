// The selected instance's notice: rejection details and the tolerated problems in its file.
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import type { AgentInstanceSummary } from '@/types/agent-config';
import { instancesMixed } from '@/composables/agent-config/__tests__/fixtures';
import { deriveInstanceState } from '@/utils/agent-config/instance-status';
import InstanceModeNotice from '../InstanceModeNotice.vue';
import { globalWith, piniaWith, READER } from './helpers';

function mountNotice(over: Partial<AgentInstanceSummary>) {
  const instance = { ...instancesMixed.items[0], ...over };
  return mount(InstanceModeNotice, {
    props: { instance, state: deriveInstanceState(instance, 7) },
    global: globalWith(piniaWith(READER)),
  });
}

describe('InstanceModeNotice', () => {
  it('explains an invalid-config rejection with its reason and error', () => {
    const w = mountNotice({
      status: 'rejected',
      reason: 'invalid-config',
      error: 'plugins.local-ssh.schedule: invalid cron',
      syncStatus: 'out-of-sync',
      warnings: [],
    });
    const details = w.find('[data-test="rejection-details"]');
    expect(details.exists()).toBe(true);
    expect(details.text()).toContain('last-known-good configuration');
    expect(details.text()).toContain('invalid cron');
  });

  it("lists the tolerated problems in the agent's file", () => {
    const w = mountNotice({});
    const block = w.find('[data-test="file-warnings"]');
    expect(block.exists()).toBe(true);
    expect(block.text()).toContain('/plugins/nightly-audit/schedule');
    expect(block.text()).toContain('Invalid value');
  });

  it('shows no rejection details for an applied instance', () => {
    const w = mountNotice({ warnings: [] });
    expect(w.find('[data-test="rejection-details"]').exists()).toBe(false);
    expect(w.find('[data-test="file-warnings"]').exists()).toBe(false);
  });
});
