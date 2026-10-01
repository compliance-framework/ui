// R76/R79 on the Configuration tab: the plugin's agent library on the Effective view, the
// inline-policy gate when adding an inline: entry, and per-instance support in the review.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import type { AgentConfigApi } from '@/composables/agent-config/useAgentConfigApi';
import { resetAgentDrafts } from '@/composables/agent-config/draftRegistry';
import type { ConfigWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import {
  SSH_SOURCE,
  UBUNTU_SOURCE,
  baseConfig,
  instanceIds,
  instancesMixed,
  previewMixed,
} from '@/composables/agent-config/fixtures';
import type {
  ConfigDoc,
  ConfigPreview,
  PluginReport,
} from '@/types/agent-config';
import type { Agent } from '@/types/agents';
import AgentConfigEffectiveView from '../AgentConfigEffectiveView.vue';
import { ADMIN, READER, fakeApi, globalWith, piniaWith } from './helpers';

vi.mock('@/components/code-editor', () => import('./codeEditorMock'));
vi.mock('primevue/useconfirm', () => ({
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

const agent: Agent = {
  id: 'agent-1',
  name: 'ssh agent',
  isActive: true,
  serviceAccountKeyCount: 1,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const reports = (
  ssh: string,
  ubuntu = 'unsupported',
  sshLib = 'v0.8.0',
): PluginReport[] => [
  {
    name: 'local-ssh',
    source: SSH_SOURCE,
    libVersion: sshLib,
    inlinePolicies: ssh,
  },
  {
    name: 'ubuntu-packages',
    source: UBUNTU_SOURCE,
    libVersion: 'v0.7.1',
    inlinePolicies: ubuntu,
  },
];

/** Instances a and b (both validated) report `a` and `b`. */
function apiWith(a: PluginReport[], b: PluginReport[] = a): AgentConfigApi {
  return fakeApi({
    listInstances: vi.fn().mockResolvedValue({
      ...instancesMixed,
      items: instancesMixed.items.map((i) =>
        i.instanceId === instanceIds.a
          ? { ...i, plugins: a }
          : i.instanceId === instanceIds.b
            ? { ...i, plugins: b }
            : i,
      ),
    }),
    preview: vi.fn().mockResolvedValue({
      ...previewMixed,
      overlayErrors: [],
      instances: previewMixed.instances.map((i) => ({ ...i, errors: [] })),
    } satisfies ConfigPreview),
  });
}

async function mountTab() {
  const wrapper = mount(AgentConfigTab, {
    props: { agent },
    global: globalWith(piniaWith(ADMIN), { teleport: true }),
    attachTo: document.body,
  });
  await flushPromises();
  const ws = (wrapper.vm as unknown as { ws: ConfigWorkspace }).ws;
  await ws.loadDetails();
  await flushPromises();
  return { wrapper, ws };
}

describe('plugin agent library badge (R76/R79)', () => {
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

  it('shows each plugin library and inline support', () => {
    const w = view(reports('supported', 'unsupported'));
    const ssh = w.find(
      '[data-test="plugin-card-local-ssh"] [data-test="plugin-lib"]',
    );
    expect(ssh.text()).toBe('agent v0.8.0 · inline ✓');
    expect(ssh.attributes('data-support')).toBe('supported');
    const ubuntu = w.find(
      '[data-test="plugin-card-ubuntu-packages"] [data-test="plugin-lib"]',
    );
    expect(ubuntu.text()).toBe('agent v0.7.1 · no inline');
    expect(ubuntu.attributes('aria-label')).toContain(
      'upgrade the plugin to a build on agent ≥ v0.8.0',
    );
  });

  it('shows nothing for agents that do not report plugins', () => {
    expect(view(null).find('[data-test="plugin-lib"]').exists()).toBe(false);
  });
});

describe('inline-policy gate on the Configuration tab (R79)', () => {
  beforeEach(() => resetAgentDrafts());

  it('refuses an inline: entry for an unsupported plugin, with the reason', async () => {
    api.current = apiWith(reports('supported'));
    const { wrapper, ws } = await mountTab();
    await wrapper
      .find('[data-test="edit-/plugins/ubuntu-packages/policies"]')
      .trigger('click');
    const editor = wrapper.find(
      '[data-test="editor-/plugins/ubuntu-packages/policies"]',
    );
    await editor.find('[data-test="new-policy"]').setValue('inline:ssh-tuned');
    expect(editor.text()).toContain(
      "plugin ubuntu-packages (agent lib v0.7.1) doesn't support inline policies",
    );
    await editor.find('form').trigger('submit');
    expect(
      ws.draft.overlay.value.plugins?.['ubuntu-packages']?.policies,
    ).toBeUndefined();
    wrapper.unmount();
  });

  it('shows per-instance support in the review when replicas diverge', async () => {
    api.current = apiWith(
      reports('supported'),
      reports('unknown', 'unknown', ''),
    );
    const { wrapper, ws } = await mountTab();
    ws.draft.set('/verbosity', 2);
    await flushPromises();
    // unknown on ip-b: a warning, Review stays enabled.
    expect(ws.blockingCount.value).toBe(0);
    await wrapper.find('[data-test="pending-review"]').trigger('click');
    await vi.dynamicImportSettled();
    await flushPromises();
    const row = wrapper.find('[data-test="inline-support-local-ssh"]');
    expect(row.exists()).toBe(true);
    expect(row.find('[data-test="inline-support-divergent"]').exists()).toBe(
      true,
    );
    expect(row.text()).toContain('ip-a: inline policies supported');
    expect(row.text()).toContain('ip-b: inline support unknown');
    wrapper.unmount();
  });
});
