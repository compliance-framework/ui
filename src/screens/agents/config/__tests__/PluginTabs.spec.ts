// The plugins of the Effective view as tabs: selection, keyboard navigation, the add action
// (which selects the new plugin's tab), removal markers and the empty state.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  flushPromises,
  mount,
  type VueWrapper,
  enableAutoUnmount,
} from '@vue/test-utils';
import type { AgentConfigApi } from '@/composables/agent-config/useAgentConfigApi';
import { resetAgentDrafts } from '@/composables/agent-config/draftRegistry';
import type { ConfigWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import type { Agent } from '@/types/agents';
import {
  ADMIN,
  READER,
  fakeApi,
  globalWith,
  piniaWith,
  workspaceHost,
} from './helpers';

vi.mock('@/ds/components/CodeEditor', () => import('./codeEditorMock'));
vi.mock('@/ds/confirm', () => ({
  useConfirm: () => ({
    require: (o: { accept?: () => void }) => o.accept?.(),
  }),
}));
const api = vi.hoisted(() => ({ current: null as unknown as AgentConfigApi }));
vi.mock('@/composables/agent-config/useAgentConfigApi', async () => {
  const actual = await vi.importActual<
    typeof import('@/composables/agent-config/useAgentConfigApi')
  >('@/composables/agent-config/useAgentConfigApi');
  return { ...actual, useAgentConfigApi: () => api.current };
});

import AgentConfigTab from '../AgentConfigTab.vue';
import AgentConfigEffectiveView from '../AgentConfigEffectiveView.vue';
import AddPluginDialog from '../editor/AddPluginDialog.vue';

enableAutoUnmount(afterEach);

const agent: Agent = {
  id: 'agent-1',
  name: 'ssh agent',
  isActive: true,
  serviceAccountKeyCount: 1,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

async function mountTab(perms: Record<string, string[]> = ADMIN) {
  const wrapper = mount(AgentConfigTab, {
    props: { agent },
    global: globalWith(piniaWith(perms)),
    attachTo: document.body,
  });
  await flushPromises();
  const ws = (wrapper.vm as unknown as { ws: ConfigWorkspace }).ws;
  return { wrapper, ws };
}

const tab = (w: VueWrapper, name: string) => w.find(`[data-tab="${name}"]`);
const selectedTabs = (w: VueWrapper) =>
  w
    .findAll('[role="tab"]')
    .filter((t) => t.attributes('aria-selected') === 'true')
    .map((t) => t.attributes('data-tab'));

describe('plugin tabs', () => {
  beforeEach(() => {
    resetAgentDrafts();
    api.current = fakeApi();
  });

  it('renders one labelled tab per plugin, the first selected, with ARIA wiring', async () => {
    const { wrapper } = await mountTab();
    const list = wrapper.find('[role="tablist"]');
    expect(list.attributes('aria-label')).toBe('Plugins');
    expect(wrapper.find('[data-test="plugin-tabs"] h2').text()).toBe('Plugins');
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((t) => t.text())).toEqual([
      expect.stringContaining('local-ssh'),
      expect.stringContaining('ubuntu-packages'),
    ]);
    expect(selectedTabs(wrapper)).toEqual(['local-ssh']);
    const panel = wrapper.find('[data-panel="local-ssh"]');
    expect(panel.attributes('role')).toBe('tabpanel');
    expect(panel.attributes('aria-labelledby')).toBe(tabs[0].attributes('id'));
    expect(tabs[0].attributes('aria-controls')).toBe(panel.attributes('id'));
    // Inactive panels stay mounted (an open editor keeps its state) but hidden.
    const other = wrapper.find('[data-panel="ubuntu-packages"]');
    expect(other.exists()).toBe(true);
    expect(other.isVisible()).toBe(false);
  });

  it('selects on click, and with the arrow keys, Home and End (moving the focus)', async () => {
    const { wrapper } = await mountTab();
    await tab(wrapper, 'ubuntu-packages').trigger('click');
    expect(selectedTabs(wrapper)).toEqual(['ubuntu-packages']);
    expect(wrapper.find('[data-panel="ubuntu-packages"]').isVisible()).toBe(
      true,
    );

    await tab(wrapper, 'ubuntu-packages').trigger('keydown', {
      key: 'ArrowRight',
    });
    // Wraps around to the first tab.
    expect(document.activeElement).toBe(tab(wrapper, 'local-ssh').element);
    await tab(wrapper, 'local-ssh').trigger('keydown', { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(
      tab(wrapper, 'ubuntu-packages').element,
    );
    await tab(wrapper, 'ubuntu-packages').trigger('keydown', { key: 'Home' });
    expect(document.activeElement).toBe(tab(wrapper, 'local-ssh').element);
    expect(selectedTabs(wrapper)).toEqual(['local-ssh']);
    await tab(wrapper, 'local-ssh').trigger('keydown', { key: 'End' });
    expect(selectedTabs(wrapper)).toEqual(['ubuntu-packages']);
  });

  it('the add action adds a pending plugin and selects its tab; discarding falls back', async () => {
    const { wrapper, ws } = await mountTab();
    const add = wrapper.find('[data-test="add-plugin"]');
    expect(add.text()).toContain('Add plugin');
    // The action sits after the tablist, not inside it.
    expect(
      wrapper.find('[role="tablist"] [data-test="add-plugin"]').exists(),
    ).toBe(false);
    await add.trigger('click');
    const dialog = wrapper.findComponent(AddPluginDialog);
    expect(dialog.props('visible')).toBe(true);
    expect(dialog.props('existing')).toEqual(
      expect.arrayContaining(['local-ssh', 'ubuntu-packages']),
    );
    dialog.vm.$emit('add', {
      name: 'extra',
      source: 'ghcr.io/compliance-framework/plugin-extra:v1',
    });
    await flushPromises();
    expect(ws.draft.overlay.value.plugins?.extra).toEqual({
      source: 'ghcr.io/compliance-framework/plugin-extra:v1',
      policies: [],
    });
    expect(selectedTabs(wrapper)).toEqual(['extra']);
    expect(
      tab(wrapper, 'extra').find('[data-test="plugin-tab-hint-new"]').exists(),
    ).toBe(true);
    const panel = wrapper.find('[data-panel="extra"]');
    expect(panel.find('[data-test="pending-new"]').exists()).toBe(true);

    await panel.find('[data-test="plugin-undo-removal"]').trigger('click');
    expect(tab(wrapper, 'extra').exists()).toBe(false);
    expect(selectedTabs(wrapper)).toEqual(['local-ssh']);
  });

  it('marks pending changes, removals and disabled plugins on the tab', async () => {
    const { wrapper, ws } = await mountTab();
    const panel = wrapper.find('[data-panel="ubuntu-packages"]');
    await panel.find('[data-test="remove-plugin"]').trigger('click');
    expect(ws.draft.overlay.value.plugins?.['ubuntu-packages']).toBeNull();
    expect(
      tab(wrapper, 'ubuntu-packages')
        .find('[data-test="plugin-tab-hint-removal"]')
        .exists(),
    ).toBe(true);
    await panel.find('[data-test="plugin-undo-removal"]').trigger('click');
    expect(
      tab(wrapper, 'ubuntu-packages')
        .find('[data-test^="plugin-tab-hint-"]')
        .exists(),
    ).toBe(false);

    ws.draft.set('/plugins/local-ssh/schedule', '0 0 * * *');
    await flushPromises();
    expect(
      tab(wrapper, 'local-ssh')
        .find('[data-test="plugin-tab-hint-pending"]')
        .exists(),
    ).toBe(true);
  });

  it('readers get no add action', async () => {
    const { wrapper } = await mountTab(READER);
    expect(wrapper.find('[data-test="add-plugin"]').exists()).toBe(false);
    expect(wrapper.findAll('[role="tab"]').length).toBe(2);
  });

  it('shows the disabled hint', () => {
    const view = mount(AgentConfigEffectiveView, {
      props: {
        effectiveDoc: {
          plugins: {
            a: { source: 'ghcr.io/x/a:v1', enabled: false },
            b: { source: 'ghcr.io/x/b:v1' },
          },
        },
        base: null,
        appliedOverlay: {},
        appliedRevisionNote: null,
        filename: 'x.yaml',
      },
      global: globalWith(piniaWith(READER)),
    });
    expect(
      view
        .find('[data-tab="a"] [data-test="plugin-tab-hint-disabled"]')
        .exists(),
    ).toBe(true);
    expect(
      view.find('[data-tab="b"] [data-test^="plugin-tab-hint"]').exists(),
    ).toBe(false);
  });

  it('handles many plugins in a scrollable strip', () => {
    const plugins = Object.fromEntries(
      Array.from({ length: 30 }, (_, n) => [
        `plugin-${String(n).padStart(2, '0')}`,
        { source: `ghcr.io/x/p${n}:v1` },
      ]),
    );
    const view = mount(AgentConfigEffectiveView, {
      props: {
        effectiveDoc: { plugins },
        base: null,
        appliedOverlay: {},
        appliedRevisionNote: null,
        filename: 'x.yaml',
      },
      global: globalWith(piniaWith(READER)),
    });
    // One tablist (it scrolls sideways when it overflows), one tab stop.
    expect(view.findAll('[role="tablist"]')).toHaveLength(1);
    expect(view.findAll('[role="tab"]').length).toBe(30);
    expect(view.findAll('[role="tab"][tabindex="0"]')).toHaveLength(1);
  });

  it('empty state: no tabs, the add action stays available', async () => {
    const out: { ws?: ConfigWorkspace } = {};
    const host = workspaceHost(
      fakeApi(),
      AgentConfigEffectiveView,
      () => ({
        effectiveDoc: { verbosity: 0, plugins: {} },
        base: { plugins: {} },
        appliedOverlay: {},
        appliedRevisionNote: null,
        filename: 'x.yaml',
      }),
      out,
    );
    const wrapper = mount(host, { global: globalWith(piniaWith(ADMIN)) });
    await flushPromises();
    expect(wrapper.text()).toContain('No plugins configured.');
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    await wrapper.find('[data-test="add-plugin"]').trigger('click');
    wrapper.findComponent(AddPluginDialog).vm.$emit('add', {
      name: 'first',
      source: 'ghcr.io/x/first:v1',
    });
    await flushPromises();
    expect(selectedTabs(wrapper)).toEqual(['first']);
  });
});
