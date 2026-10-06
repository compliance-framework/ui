// R76 on the Configuration tab: the plugin's agent library on the Effective view.
import { afterEach, describe, expect, it } from 'vitest';
import { mount, enableAutoUnmount } from '@vue/test-utils';
import {
  SSH_SOURCE,
  baseConfig,
} from '@/composables/agent-config/__tests__/fixtures';
import type { ConfigDoc, PluginReport } from '@/types/agent-config';
import AgentConfigEffectiveView from '../AgentConfigEffectiveView.vue';
import { READER, globalWith, piniaWith } from './helpers';

// PrimeVue's TabList schedules a 150 ms ink-bar update on mount and never clears it; a wrapper
// left mounted lets it fire after this file's jsdom environment is torn down
// ("HTMLElement is not defined"). Unmounting nulls its refs, so the timer becomes a no-op.
enableAutoUnmount(afterEach);

describe('plugin agent library badge (R76)', () => {
  function view(plugins: PluginReport[] | null) {
    return mount(AgentConfigEffectiveView, {
      props: {
        effectiveDoc: baseConfig as ConfigDoc,
        base: baseConfig,
        appliedOverlay: {},
        appliedRevisionNote: null,
        filename: 'x.yaml',
        pluginReports: plugins,
      },
      global: globalWith(piniaWith(READER)),
    });
  }

  it('shows the reported library, and nothing when it is unknown', () => {
    const w = view([
      { name: 'local-ssh', source: SSH_SOURCE, libVersion: 'v0.1.9' },
      { name: 'ubuntu-packages', libVersion: '' },
    ]);
    expect(
      w
        .find('[data-test="plugin-card-local-ssh"] [data-test="plugin-lib"]')
        .text(),
    ).toBe('agent v0.1.9');
    expect(
      w
        .find(
          '[data-test="plugin-card-ubuntu-packages"] [data-test="plugin-lib"]',
        )
        .exists(),
    ).toBe(false);
  });

  it('shows nothing for agents that do not report plugins', () => {
    const w = view(null);
    // The card renders: only its library badge is absent.
    expect(w.find('[data-test="plugin-card-local-ssh"]').exists()).toBe(true);
    expect(w.find('[data-test="plugin-lib"]').exists()).toBe(false);
  });
});
