// The plugin tabs with a workspace: removal hints for any plugin name, "Add plugin" never
// replacing a plugin the saved overlay defines, and editing that waits for every instance file.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enableAutoUnmount,
  flushPromises,
  mount,
  type VueWrapper,
} from '@vue/test-utils';
import type { AgentConfigApi } from '@/composables/agent-config/api-types';
import type { ConfigWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import { resetAgentDrafts } from '@/composables/agent-config/draftRegistry';
import type { AgentInstanceDetail, PluginDoc } from '@/types/agent-config';
import {
  configRev7,
  instanceIds,
} from '@/composables/agent-config/__tests__/fixtures';
import { clone } from '@/utils/agent-config/merge-patch';
import {
  ADMIN,
  fakeApi,
  globalWith,
  piniaWith,
  workspaceHost,
} from './helpers';

vi.mock('@/components/code-editor', () => import('./codeEditorMock'));

import AgentConfigEffectiveView from '../AgentConfigEffectiveView.vue';

enableAutoUnmount(afterEach);

async function mountView(api: AgentConfigApi) {
  const out: { ws?: ConfigWorkspace } = {};
  const host = workspaceHost(
    api,
    AgentConfigEffectiveView,
    () => ({
      effectiveDoc: out.ws!.state.selectedInstance.value?.effective ?? null,
      base: out.ws!.state.selectedInstance.value?.base ?? null,
      appliedOverlay: out.ws!.state.appliedOverlay.value,
      appliedRevisionNote: null,
      filename: 'x.yaml',
    }),
    out,
  );
  const wrapper = mount(host, {
    global: globalWith(piniaWith(ADMIN), { teleport: true }),
    attachTo: document.body,
  });
  await flushPromises();
  return { wrapper, ws: out.ws! };
}

/** ip-b's detail comes from `b` (deferred or failing); the others load at once. */
function apiWithB(b: (d: AgentInstanceDetail) => Promise<AgentInstanceDetail>) {
  const fallback = fakeApi().getInstance;
  return fakeApi({
    getInstance: vi.fn(async (agentId: string, id: string) => {
      const d = await fallback(agentId, id);
      return id === instanceIds.b ? b(d) : d;
    }),
  });
}

const addButton = (w: VueWrapper) => w.find('[data-test="add-plugin"]');

describe('PluginTabs with a workspace', () => {
  beforeEach(() => resetAgentDrafts());

  it('marks the pending removal of a plugin named "constructor"', async () => {
    // Typed as a plain string, so `plugins[name]` is the index signature.
    const name: string = 'constructor';
    const ctor: PluginDoc = { source: 'ghcr.io/compliance-framework/ctor:v1' };
    const fallback = fakeApi().getInstance;
    const { wrapper, ws } = await mountView(
      fakeApi({
        getInstance: vi.fn(async (agentId: string, id: string) => {
          const d = clone(await fallback(agentId, id));
          if (d.base) d.base.plugins![name] = clone(ctor);
          if (d.effective) d.effective.plugins![name] = clone(ctor);
          return d;
        }),
      }),
    );
    const tab = () => wrapper.find('[data-test="plugin-tab-constructor"]');
    expect(tab().exists()).toBe(true);
    ws.draft.makeAbsent('/plugins/constructor');
    await flushPromises();
    expect(tab().find('[data-test="plugin-tab-hint-removal"]').exists()).toBe(
      true,
    );
  });

  it('refuses to add a plugin the saved overlay defines, and keeps its definition', async () => {
    // r7 also adds `extra`; the instances do not run it yet, so it has no tab.
    const saved = clone(configRev7);
    saved.overlay!.plugins!.extra = {
      source: 'ghcr.io/compliance-framework/plugin-extra:v1',
      config: { region: 'eu-west-1' },
      policy_data: { threshold: 5 },
    };
    const { wrapper, ws } = await mountView(
      fakeApi({ getConfig: vi.fn().mockResolvedValue(saved) }),
    );
    expect(wrapper.find('[data-test="plugin-tab-extra"]').exists()).toBe(false);

    await addButton(wrapper).trigger('click');
    await wrapper.find('[data-test="add-plugin-name"]').setValue('extra');
    await wrapper
      .find('[data-test="add-plugin-source"]')
      .setValue('ghcr.io/compliance-framework/plugin-extra:v2');
    expect(wrapper.text()).toContain('A plugin with this name exists');
    await wrapper.find('[data-test="add-plugin-form"]').trigger('submit');
    await flushPromises();

    const extra = ws.draft.overlay.value.plugins?.extra;
    expect(extra?.source).toBe('ghcr.io/compliance-framework/plugin-extra:v1');
    expect(extra?.config).toEqual({ region: 'eu-west-1' });
    expect(extra?.policy_data).toEqual({ threshold: 5 });
  });

  it('waits for every instance file before Add plugin', async () => {
    let releaseB!: () => void;
    const { wrapper } = await mountView(
      apiWithB(
        (d) => new Promise<AgentInstanceDetail>((r) => (releaseB = () => r(d))),
      ),
    );
    expect(wrapper.find('[data-test="bases-loading"]').exists()).toBe(true);
    expect(addButton(wrapper).attributes('disabled')).toBeDefined();

    releaseB();
    await flushPromises();
    expect(wrapper.find('[data-test="bases-loading"]').exists()).toBe(false);
    expect(addButton(wrapper).attributes('disabled')).toBeUndefined();
  });

  it('names an instance file that failed to load, and Retry loads it', async () => {
    let fail = true;
    const { wrapper } = await mountView(
      apiWithB(async (d) => {
        if (fail) throw new Error('502');
        return d;
      }),
    );
    const notice = wrapper.find('[data-test="bases-failed"]');
    expect(notice.exists()).toBe(true);
    expect(notice.text()).toContain('ip-b');
    expect(addButton(wrapper).attributes('disabled')).toBeDefined();

    fail = false;
    await wrapper.find('[data-test="bases-retry"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-test="bases-failed"]').exists()).toBe(false);
    expect(addButton(wrapper).attributes('disabled')).toBeUndefined();
  });
});
