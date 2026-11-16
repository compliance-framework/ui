import { afterEach, describe, expect, it } from 'vitest';
import { mount, enableAutoUnmount } from '@vue/test-utils';
import type { ConfigDoc, OverlayDoc } from '@/types/agent-config';
import { baseConfig } from '@/composables/agent-config/__tests__/fixtures';
import { mergePatch } from '@/utils/agent-config/merge-patch';
import AgentConfigEffectiveView from '../AgentConfigEffectiveView.vue';
import { globalWith, piniaWith, READER } from './helpers';

enableAutoUnmount(afterEach);

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

  it('shows the forbidden keys as set on the agent host (R71) and never renders client_secret', () => {
    const leaky = mergePatch<ConfigDoc>(baseConfig, {}) as ConfigDoc;
    leaky.api = {
      url: 'https://x',
      auth: { client_id: 'cid', client_secret: 'SUPER-SECRET' },
    };
    const wrapper = mountView({}, leaky);
    const locked = wrapper.find('[data-test="locked-keys"]');
    expect(locked.text()).toContain('api.auth.client_id');
    expect(locked.text()).toContain('cid');
    expect(locked.findAll('dt')).toHaveLength(8);
    expect(locked.text()).toContain(
      'Set on the agent host; can never be changed remotely.',
    );
    // No pencil on a forbidden field.
    expect(locked.find('[data-test^="edit-"]').exists()).toBe(false);
    expect(wrapper.html()).not.toContain('SUPER-SECRET');
  });

  it('never renders client_secret in YAML mode either', async () => {
    const leaky = mergePatch<ConfigDoc>(baseConfig, {}) as ConfigDoc;
    leaky.api = {
      url: 'https://x',
      auth: { client_id: 'cid', client_secret: 'SUPER-SECRET' },
    };
    const wrapper = mountView({}, leaky);
    await wrapper
      .find('[data-test="effective-mode"] input[value="yaml"]')
      .setValue(true);
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

  it('matches removed plugins by own name only (a plugin may be named "constructor")', () => {
    const removedCtor = (base: ConfigDoc) =>
      mount(AgentConfigEffectiveView, {
        props: {
          effectiveDoc: mergePatch<ConfigDoc>(base, CTOR_REMOVED),
          base,
          appliedOverlay: CTOR_REMOVED,
          appliedRevisionNote: null,
          filename: 'x.yaml',
        },
        global: globalWith(piniaWith(READER)),
      }).find('[data-test="plugin-card-constructor"]');
    // The file has it and the overlay removes it: a "Removed by overlay" card.
    const withCtor = mergePatch<ConfigDoc>(baseConfig, {
      plugins: { constructor: { source: 'ghcr.io/x/ctor:v1' } },
    });
    expect(removedCtor(withCtor).text()).toContain('Removed by overlay');
    // The file lacks it: no card (Object#constructor is not a plugin).
    expect(removedCtor(baseConfig).exists()).toBe(false);
  });
});

const CTOR_REMOVED: OverlayDoc = JSON.parse('{"plugins":{"constructor":null}}');
