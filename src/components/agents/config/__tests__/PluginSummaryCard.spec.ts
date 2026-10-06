// The plugin card's removal actions: a pending removal (with Undo) for any plugin name, and
// Remove only once every instance's file is loaded (removal nulls the plugin where a file has it).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import type { AgentConfigApi } from '@/composables/agent-config/api-types';
import type { ConfigWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import { resetAgentDrafts } from '@/composables/agent-config/draftRegistry';
import type { AgentInstanceDetail, PluginDoc } from '@/types/agent-config';
import {
  baseConfig,
  instanceIds,
} from '@/composables/agent-config/__tests__/fixtures';
import { clone } from '@/utils/agent-config/merge-patch';
import { getAt, hasAt } from '@/utils/agent-config/json-pointer';
import {
  ADMIN,
  fakeApi,
  globalWith,
  piniaWith,
  workspaceHost,
} from './helpers';

vi.mock('@/components/code-editor', () => import('./codeEditorMock'));
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: (o: { accept?: () => void }) => o.accept?.(),
  }),
}));

import PluginSummaryCard from '../PluginSummaryCard.vue';

enableAutoUnmount(afterEach);

// Typed as a plain string, so `plugins[CTOR_NAME]` is the index signature, not Object#constructor.
const CTOR_NAME: string = 'constructor';
const CTOR: PluginDoc = {
  source: 'ghcr.io/compliance-framework/plugin-ctor:v1',
};

/** Every instance's file (and report) also runs a plugin named "constructor". */
function apiWithCtor(over: Partial<AgentConfigApi> = {}) {
  const fallback = fakeApi().getInstance;
  return fakeApi({
    getInstance: vi.fn(async (agentId: string, id: string) => {
      const d = clone(await fallback(agentId, id));
      if (d.base) d.base.plugins![CTOR_NAME] = clone(CTOR);
      if (d.effective) d.effective.plugins![CTOR_NAME] = clone(CTOR);
      return d;
    }),
    ...over,
  });
}

async function mountCard(api: AgentConfigApi, name = 'constructor') {
  const base = clone(baseConfig);
  base.plugins![CTOR_NAME] = clone(CTOR);
  const out: { ws?: ConfigWorkspace } = {};
  const host = workspaceHost(
    api,
    PluginSummaryCard,
    () => ({
      name,
      plugin: base.plugins![name],
      base,
      overlay: {},
    }),
    out,
  );
  const wrapper = mount(host, { global: globalWith(piniaWith(ADMIN)) });
  await flushPromises();
  return { wrapper, ws: out.ws! };
}

describe('PluginSummaryCard: removal', () => {
  beforeEach(() => resetAgentDrafts());

  it('shows the pending removal of a plugin named "constructor", with Undo', async () => {
    const { wrapper, ws } = await mountCard(apiWithCtor());
    const card = wrapper.find('[data-test="plugin-card-constructor"]');
    expect(card.exists()).toBe(true);
    expect(card.find('[data-test="pending-removal"]').exists()).toBe(false);

    await card.find('[data-test="remove-plugin"]').trigger('click');
    // The removal is in the draft...
    expect(hasAt(ws.draft.overlay.value, '/plugins/constructor')).toBe(true);
    expect(getAt(ws.draft.overlay.value, '/plugins/constructor')).toBeNull();
    // ...so the card says so and offers Undo.
    expect(card.find('[data-test="pending-removal"]').exists()).toBe(true);
    await card.find('[data-test="plugin-undo-removal"]').trigger('click');
    expect(ws.draft.isDirty.value).toBe(false);
  });

  it('offers Remove only once every instance file is loaded', async () => {
    let releaseB!: () => void;
    const fallback = apiWithCtor().getInstance;
    const { wrapper } = await mountCard(
      apiWithCtor({
        getInstance: vi.fn(async (agentId: string, id: string) => {
          const d = await fallback(agentId, id);
          if (id !== instanceIds.b) return d;
          return new Promise<AgentInstanceDetail>(
            (r) => (releaseB = () => r(d)),
          );
        }),
      }),
      'local-ssh',
    );
    const remove = () => wrapper.find('[data-test="remove-plugin"]');
    expect(remove().exists()).toBe(true);
    expect(remove().attributes('disabled')).toBeDefined();

    releaseB();
    await flushPromises();
    expect(remove().attributes('disabled')).toBeUndefined();
  });
});
