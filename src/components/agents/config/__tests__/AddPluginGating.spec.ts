// R71 for adding a plugin: the add action is disabled when no reporting instance could install
// a new plugin, shielded when only some could, plain when all could; the dialog re-evaluates
// with the concrete source, and the new plugin's tab/fields keep the shield.
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
import type { AgentInstanceSummary } from '@/types/agent-config';
import type { Agent } from '@/types/agents';
import {
  configRev7,
  detailFor,
  instancesMixed,
  remoteConfigSafe,
} from '@/composables/agent-config/__tests__/fixtures';
import {
  ADMIN,
  fakeApi,
  globalWith,
  pagedListInstances,
  piniaWith,
} from './helpers';

vi.mock('@/components/code-editor', () => import('./codeEditorMock'));
const api = vi.hoisted(() => ({ current: null as unknown as AgentConfigApi }));
vi.mock('@/composables/agent-config/useAgentConfigApi', async () => {
  const actual = await vi.importActual<
    typeof import('@/composables/agent-config/useAgentConfigApi')
  >('@/composables/agent-config/useAgentConfigApi');
  return { ...actual, useAgentConfigApi: () => api.current };
});

import AgentConfigTab from '../AgentConfigTab.vue';

// PrimeVue's TabList schedules a 150 ms ink-bar update on mount and never clears it; a wrapper
// left mounted lets it fire after this file's jsdom environment is torn down
// ("HTMLElement is not defined"). Unmounting nulls its refs, so the timer becomes a no-op.
enableAutoUnmount(afterEach);

const agent: Agent = {
  id: 'agent-1',
  name: 'ssh agent',
  isActive: true,
  serviceAccountKeyCount: 1,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

// Fixture fleet (fresh, reported): ip-a, ip-b, ip-f, ip-g apply_safe trusting
// ghcr.io/compliance-framework/*, ip-c report-only.
const fresh = instancesMixed.items.filter(
  (i) => !i.stale && i.reportedAt != null,
);

function withInstances(items: AgentInstanceSummary[]) {
  api.current = fakeApi({ listInstances: pagedListInstances(items) });
}

async function mountTab() {
  const wrapper = mount(AgentConfigTab, {
    props: { agent },
    global: globalWith(piniaWith(ADMIN), { teleport: true }),
    attachTo: document.body,
  });
  await flushPromises();
  const ws = (wrapper.vm as unknown as { ws: ConfigWorkspace }).ws;
  return { wrapper, ws };
}

const addButton = (w: VueWrapper) => w.find('[data-test="add-plugin"]');

async function openDialog(w: VueWrapper, source: string, name = 'extra') {
  await addButton(w).trigger('click');
  await w.find('[data-test="add-plugin-name"]').setValue(name);
  await w.find('[data-test="add-plugin-source"]').setValue(source);
}

describe('add-plugin gating (R71)', () => {
  beforeEach(() => {
    resetAgentDrafts();
    api.current = fakeApi();
  });

  it('none could install: disabled, with the reasons', async () => {
    withInstances(
      fresh.map((i) => ({
        ...i,
        mode: 'report' as const,
        remoteConfig: { ...remoteConfigSafe, mode: 'report' as const },
      })),
    );
    const { wrapper } = await mountTab();
    expect(addButton(wrapper).attributes('disabled')).toBeDefined();
    const why = wrapper
      .find('[data-test="add-plugin-wrapper"]')
      .attributes('aria-label');
    expect(why).toContain('No reporting instance would install a new plugin');
    expect(why).toContain('report-only mode');
    expect(
      wrapper.find('[data-test="add-plugin-wrapper"]').attributes('tabindex'),
    ).toBe('0');
  });

  it('some could: enabled with a shield', async () => {
    const { wrapper } = await mountTab();
    expect(addButton(wrapper).attributes('disabled')).toBeUndefined();
    expect(
      wrapper
        .find('[data-test="add-plugin-restricted"]')
        .attributes('aria-label'),
    ).toContain('ip-c');
  });

  it('all could: enabled without a shield', async () => {
    withInstances(fresh.filter((i) => i.mode !== 'report'));
    const { wrapper } = await mountTab();
    expect(addButton(wrapper).attributes('disabled')).toBeUndefined();
    expect(wrapper.find('[data-test="add-plugin-restricted"]').exists()).toBe(
      false,
    );
  });

  it('apply_safe without trusted_sources could only reuse a source its file has', async () => {
    withInstances(
      fresh
        .filter((i) => i.mode !== 'report')
        .map((i) => ({
          ...i,
          remoteConfig: { ...remoteConfigSafe, trusted_sources: [] },
        })),
    );
    const { wrapper } = await mountTab();
    // Their files use sources (fixture base), so adding stays possible but shielded.
    expect(addButton(wrapper).attributes('disabled')).toBeUndefined();
    expect(
      wrapper
        .find('[data-test="add-plugin-restricted"]')
        .attributes('aria-label'),
    ).toContain('only a source this host already uses');
    await openDialog(
      wrapper,
      'ghcr.io/compliance-framework/plugin-local-ssh:v1.2.0',
    );
    expect(
      wrapper.find('[data-test="add-plugin-access"]').attributes('data-state'),
    ).toBe('editable');
    await wrapper
      .find('[data-test="add-plugin-source"]')
      .setValue('ghcr.io/compliance-framework/plugin-new:v1');
    expect(
      wrapper.find('[data-test="add-plugin-access"]').attributes('data-state'),
    ).toBe('readonly');
    expect(
      wrapper.find('[data-test="add-plugin-submit"]').attributes('disabled'),
    ).toBeDefined();
  });

  it('no reporting instance (all stale): enabled without a shield, and the dialog says why', async () => {
    // The Effective view needs a reported instance; with only stale reports none is counted.
    withInstances(fresh.map((i) => ({ ...i, stale: true })));
    const { wrapper } = await mountTab();
    expect(addButton(wrapper).attributes('disabled')).toBeUndefined();
    expect(wrapper.find('[data-test="add-plugin-restricted"]').exists()).toBe(
      false,
    );
    await openDialog(wrapper, 'docker.io/acme/p:v1');
    const access = wrapper.find('[data-test="add-plugin-access"]');
    expect(access.attributes('data-state')).toBe('editable');
    expect(access.text()).toContain('No instance has a fresh report');
  });

  it('screen-reader descriptions stay inside a positioned box (no second page scrollbar)', async () => {
    // A position:absolute sr-only element without a positioned ancestor is placed against the
    // document and, deep inside the scrolling <main>, stretches the page itself.
    const { wrapper } = await mountTab();
    const srOnly = wrapper.findAll('.sr-only');
    expect(srOnly.length).toBeGreaterThan(0);
    for (const el of srOnly) {
      expect(el.element.parentElement!.closest('.relative')).not.toBeNull();
    }
    expect(wrapper.find('[data-test="plugin-tabs"]').classes()).toContain(
      'relative',
    );
  });

  it('the dialog re-evaluates with the concrete source', async () => {
    const { wrapper } = await mountTab();
    await openDialog(wrapper, 'ghcr.io/compliance-framework/plugin-extra:v1');
    let access = wrapper.find('[data-test="add-plugin-access"]');
    expect(access.attributes('data-state')).toBe('restricted');
    expect(access.text()).toContain('May not be installed on 1 of 5');
    expect(access.text()).toContain('ip-c');

    // Untrusted OCI source: no apply_safe instance installs it, ip-c never does.
    await wrapper
      .find('[data-test="add-plugin-source"]')
      .setValue('docker.io/acme/extra:v1');
    access = wrapper.find('[data-test="add-plugin-access"]');
    expect(access.attributes('data-state')).toBe('readonly');
    expect(access.text()).toContain('matches no trusted_sources entry');
    expect(
      wrapper.find('[data-test="add-plugin-submit"]').attributes('disabled'),
    ).toBeDefined();

    // A local path is forbidden without apply_all + allow_local_sources.
    await wrapper.find('[data-test="add-plugin-source"]').setValue('/opt/p');
    expect(wrapper.find('[data-test="add-plugin-access"]').text()).toContain(
      'allow_local_sources',
    );
  });

  it("keeps the shield on the new plugin's tab, card and fields", async () => {
    const all: AgentInstanceSummary = {
      ...fresh[0],
      instanceId: '0f5e2c1a-0000-4000-8000-0000000000aa',
      hostname: 'ip-all',
      mode: 'apply_all',
      remoteConfig: { ...remoteConfigSafe, mode: 'apply_all' },
    };
    withInstances([...fresh.filter((i) => i.mode === 'apply_safe'), all]);
    // ip-all's file loads too: editing waits for every reporting instance's file.
    const fallback = api.current.getInstance;
    api.current.getInstance = vi.fn(async (agentId: string, id: string) =>
      id === all.instanceId
        ? detailFor(all, configRev7.overlay ?? {})
        : fallback(agentId, id),
    );
    const { wrapper, ws } = await mountTab();
    await openDialog(wrapper, 'docker.io/acme/extra:v1');
    expect(
      wrapper.find('[data-test="add-plugin-access"]').attributes('data-state'),
    ).toBe('restricted');
    await wrapper.find('[data-test="add-plugin-form"]').trigger('submit');
    await flushPromises();
    expect(ws.draft.overlay.value.plugins?.extra?.source).toBe(
      'docker.io/acme/extra:v1',
    );
    const tab = wrapper.find('[data-test="plugin-tab-extra"]');
    expect(tab.find('[data-test="plugin-tab-restricted"]').exists()).toBe(true);
    const desc = document.getElementById(tab.attributes('aria-describedby')!);
    expect(desc?.textContent).toContain('May not be installed on 4 of 5');
    const panel = wrapper.find('[data-test="plugin-panel-extra"]');
    expect(
      panel
        .find('[data-test="plugin-install-access"]')
        .attributes('data-state'),
    ).toBe('restricted');
    expect(
      panel
        .find('[data-test="field-/plugins/extra/schedule"]')
        .attributes('data-state'),
    ).toBe('restricted');
  });
});
