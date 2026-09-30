import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import type { ConfigDoc, OverlayDoc } from '@/types/agent-config';
import { baseConfig } from '@/composables/agent-config/fixtures';
import { mergePatch } from '@/utils/agent-config/merge-patch';
import AgentConfigEffectiveView from '../AgentConfigEffectiveView.vue';
import { globalWith, piniaWith, READER } from './helpers';

function mountView(
  overlay: OverlayDoc,
  effectiveOverride?: ConfigDoc,
  note: number | null = null,
) {
  const effective =
    effectiveOverride ?? mergePatch<ConfigDoc>(baseConfig, overlay);
  return mount(AgentConfigEffectiveView, {
    props: {
      effectiveDoc: effective,
      base: baseConfig,
      appliedOverlay: overlay,
      appliedRevisionNote: note,
      filename: 'a-effective-r7.yaml',
    },
    global: globalWith(piniaWith(READER)),
  });
}

describe('AgentConfigEffectiveView', () => {
  it('renders provenance badges for file / overlay / overrides / removed', () => {
    const wrapper = mountView({
      verbosity: 2,
      plugins: {
        'ubuntu-packages': null,
        extra: { source: 'ghcr.io/compliance-framework/extra:v1' },
        'local-ssh': { schedule: '@hourly' },
      },
    });
    const ssh = wrapper.find('[data-test="plugin-card-local-ssh"]');
    expect(ssh.find('[data-provenance="overrides-file"]').exists()).toBe(true);
    const extra = wrapper.find('[data-test="plugin-card-extra"]');
    expect(extra.find('[data-provenance="overlay"]').exists()).toBe(true);
    const removed = wrapper.find('[data-test="plugin-card-ubuntu-packages"]');
    expect(removed.text()).toContain('Removed by overlay');
    expect(
      removed.find('[data-provenance="removed-by-overlay"]').exists(),
    ).toBe(true);
    const flags = wrapper.find('[data-test="flags-summary"]');
    expect(flags.text()).toContain('Trace');
    expect(flags.find('[data-provenance="overrides-file"]').exists()).toBe(
      true,
    );
  });

  it('shows plain file provenance when the applied overlay is empty, and the pending note', () => {
    const wrapper = mountView({}, undefined, 6);
    expect(
      wrapper
        .find('[data-test="plugin-card-local-ssh"] [data-provenance="file"]')
        .exists(),
    ).toBe(true);
    expect(wrapper.find('[data-test="provenance-note"]').text()).toContain(
      'r6',
    );
  });

  it('shows the locked panel with the R30 tooltip and never renders client_secret', () => {
    const leaky = mergePatch<ConfigDoc>(baseConfig, {}) as ConfigDoc;
    leaky.api = {
      url: 'https://x',
      auth: { client_id: 'cid', client_secret: 'SUPER-SECRET' },
    };
    const wrapper = mountView({}, leaky);
    const locked = wrapper.find('[data-test="locked-keys"]');
    expect(locked.text()).toContain('api.auth.client_id');
    expect(locked.text()).toContain('cid');
    expect(locked.findAll('[data-test="lock-icon"]').length).toBe(9);
    expect(
      locked.find('[data-test="lock-icon"]').attributes('aria-label'),
    ).toBe(
      'Set locally on the agent host (config file, environment or CLI); cannot be changed from CCF',
    );
    expect(wrapper.html()).not.toContain('SUPER-SECRET');
  });

  it('never renders client_secret in YAML mode either', async () => {
    const leaky = mergePatch<ConfigDoc>(baseConfig, {}) as ConfigDoc;
    leaky.api = {
      url: 'https://x',
      auth: { client_id: 'cid', client_secret: 'SUPER-SECRET' },
    };
    const wrapper = mountView({}, leaky);
    (
      wrapper.vm as unknown as { $: { setupState: { mode: string } } }
    ).$.setupState.mode = 'yaml';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="yaml-text"]').text()).toContain(
      'client_id: cid',
    );
    expect(wrapper.html()).not.toContain('SUPER-SECRET');
  });

  it('shows the not-reported text without an effective config', () => {
    const wrapper = mount(AgentConfigEffectiveView, {
      props: {
        effectiveDoc: null,
        base: null,
        appliedOverlay: null,
        appliedRevisionNote: null,
        filename: 'x.yaml',
      },
      global: globalWith(piniaWith(READER)),
    });
    expect(wrapper.find('[data-test="effective-empty"]').text()).toContain(
      'No configuration reported yet.',
    );
  });
});
