// R68 route + R69 shared draft: edits made on the Configuration tab and in the Policies view
// accumulate in one pending-changes draft and are saved as one revision.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { AgentConfigApi } from '@/composables/agent-config/api-types';
import { AgentConfigApiError } from '@/composables/agent-config/api-types';
import { resetAgentDrafts } from '@/composables/agent-config/draftRegistry';
import { resetVendorSourceCache } from '@/composables/agent-config/useVendorSources';
import {
  FIXTURE_ARTIFACT_SOURCES,
  configRev7,
  overlayRev7,
  previewMixed,
} from '@/composables/agent-config/fixtures';
import type { ConfigPreview } from '@/types/agent-config';
import type { Agent } from '@/types/agents';
import {
  ADMIN,
  fakeApi,
  globalWith,
  piniaWith,
} from '@/components/agents/config/__tests__/helpers';

vi.mock(
  '@/components/code-editor',
  () => import('@/components/agents/config/__tests__/codeEditorMock'),
);
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: (o: { accept?: () => void }) => o.accept?.(),
  }),
}));
vi.mock('@/composables/axios', async () => {
  const actual = await vi.importActual<typeof import('@/composables/axios')>(
    '@/composables/axios',
  );
  return {
    ...actual,
    useDataApi: () => ({
      data: ref({ id: 'agent-1', name: 'ssh agent' }),
      isLoading: ref(false),
      error: ref(null),
      execute: vi.fn(),
    }),
  };
});
const api = vi.hoisted(() => ({ current: null as unknown as AgentConfigApi }));
vi.mock('@/composables/agent-config/useAgentConfigApi', async () => {
  const actual = await vi.importActual<
    typeof import('@/composables/agent-config/useAgentConfigApi')
  >('@/composables/agent-config/useAgentConfigApi');
  return { ...actual, useAgentConfigApi: () => api.current };
});

import AgentPoliciesView from '../admin/AgentPoliciesView.vue';
import AgentConfigTab from '@/components/agents/config/AgentConfigTab.vue';
import AgentPoliciesPage from '@/components/agents/policies/AgentPoliciesPage.vue';
import type { ConfigWorkspace } from '@/composables/agent-config/useConfigWorkspace';

const agent: Agent = {
  id: 'agent-1',
  name: 'ssh agent',
  isActive: true,
  serviceAccountKeyCount: 1,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

const cleanPreview: ConfigPreview = {
  ...previewMixed,
  overlayErrors: [],
  instances: previewMixed.instances.map((i) => ({ ...i, errors: [] })),
};

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/admin/agents',
        name: 'admin-agents',
        component: { template: '<div/>' },
      },
      {
        path: '/admin/agents/:id/policies',
        name: 'admin-agent-policies',
        component: AgentPoliciesView,
      },
    ],
  });
}

async function mountPoliciesView(
  perms: Record<string, string[]> = ADMIN,
  query = '',
  router = makeRouter(),
) {
  await router.push(`/admin/agents/agent-1/policies${query}`);
  const g = globalWith(piniaWith(perms), { teleport: true });
  const wrapper = mount(AgentPoliciesView, {
    global: {
      ...g,
      plugins: [...g.plugins, router],
      stubs: { teleport: true },
    },
  });
  await flushPromises();
  await flushPromises();
  return wrapper;
}

describe('AgentPoliciesView (R68)', () => {
  beforeEach(() => {
    resetAgentDrafts();
    resetVendorSourceCache();
    api.current = fakeApi({
      preview: vi.fn().mockResolvedValue(cleanPreview),
      getArtifactFile: vi
        .fn()
        .mockImplementation(async (d: string, p: string) => {
          const source = FIXTURE_ARTIFACT_SOURCES[d]?.[p];
          if (source === undefined)
            throw new AgentConfigApiError({
              kind: 'other',
              status: 404,
              message: 'x',
            });
          return { path: p, sha256: '0', source };
        }),
    });
  });

  it('loads the agent configuration, every reported instance, and opens ?bundle=', async () => {
    const wrapper = await mountPoliciesView(ADMIN, '?bundle=ssh-tuned');
    expect(api.current.getConfig).toHaveBeenCalledWith('agent-1');
    // The selected instance plus the 5 other reported ones.
    expect(api.current.getInstance).toHaveBeenCalledTimes(6);
    expect(wrapper.find('[data-test="bundle-header"]').text()).toContain(
      'ssh-tuned',
    );
    expect(wrapper.find('[data-test="placeholder-instance"]').text()).toContain(
      'ip-a',
    );
    const back = wrapper.find('[data-test="back-to-configuration"]');
    expect(back.attributes('href')).toBe(
      '/admin/agents?agent=agent-1&tab=config',
    );
  });

  it('shares ONE pending draft with the Configuration tab, saved as one revision (R69)', async () => {
    // 1. An inline edit on the Configuration tab.
    const tab = mount(AgentConfigTab, {
      props: { agent },
      global: globalWith(piniaWith(ADMIN), { teleport: true }),
    });
    await flushPromises();
    await tab.find('[data-test="edit-/verbosity"]').trigger('click');
    await tab
      .findComponent({ name: 'InlineScalarEditor' })
      .findComponent({ name: 'Select' })
      .vm.$emit('update:modelValue', 2);
    await tab.find('[data-test="editor-/verbosity"] form').trigger('submit');
    await flushPromises();
    expect(tab.find('[data-test="pending-count"]').text()).toBe(
      '1 pending change',
    );
    tab.unmount();

    // 2. Navigate to the Policies view: the change is still pending; override a file.
    const view = await mountPoliciesView(ADMIN, '?bundle=ssh-tuned');
    expect(view.find('[data-test="pending-count"]').text()).toBe(
      '1 pending change',
    );
    await view
      .find('[data-file="root_login.rego"] [data-action="override"]')
      .trigger('click');
    await flushPromises();
    expect(view.find('[data-test="pending-count"]').text()).toBe(
      '2 pending changes',
    );
    view.unmount();

    // 3. Back on the tab: both changes, saved together.
    api.current.putConfig = vi.fn().mockResolvedValue({
      revision: { ...configRev7, revision: 8 },
      created: true,
    });
    const tab2 = mount(AgentConfigTab, {
      props: { agent },
      global: globalWith(piniaWith(ADMIN), { teleport: true }),
    });
    await flushPromises();
    expect(tab2.find('[data-test="pending-count"]').text()).toBe(
      '2 pending changes',
    );
    await tab2.find('[data-test="pending-review"]').trigger('click');
    await vi.dynamicImportSettled();
    await flushPromises();
    await tab2.find('[data-test="save-config"]').trigger('click');
    await flushPromises();
    expect(api.current.putConfig).toHaveBeenCalledTimes(1);
    const body = (api.current.putConfig as ReturnType<typeof vi.fn>).mock
      .calls[0][1];
    expect(body.overlay.verbosity).toBe(2);
    expect(
      body.overlay.policy_bundles['ssh-tuned'].modules['root_login.rego'],
    ).toContain('package compliance_framework.root_login');
  });

  it('re-creates the page per agent id: an in-place A → B navigation edits and saves B only', async () => {
    const configB = {
      ...configRev7,
      agentId: 'agent-2',
      overlay: { ...overlayRev7, verbosity: 2 },
    };
    api.current.getConfig = vi
      .fn()
      .mockImplementation(async (id: string) =>
        id === 'agent-2' ? configB : configRev7,
      );
    api.current.putConfig = vi.fn().mockResolvedValue({
      revision: { ...configB, revision: 8 },
      created: true,
    });
    const router = makeRouter();
    const view = await mountPoliciesView(ADMIN, '?bundle=ssh-tuned', router);
    const pageWs = () =>
      (
        view.findComponent(AgentPoliciesPage).vm as unknown as {
          ws: ConfigWorkspace;
        }
      ).ws;
    const wsA = pageWs();
    expect(wsA.draft.original.value.verbosity).toBe(1);

    // Same route record, different :id: Vue Router reuses the route component.
    await router.push('/admin/agents/agent-2/policies?bundle=ssh-tuned');
    await flushPromises();
    await flushPromises();
    expect(api.current.getConfig).toHaveBeenLastCalledWith('agent-2');
    const wsB = pageWs();
    expect(wsB).not.toBe(wsA);
    expect(wsB.draft.original.value.verbosity).toBe(2);
    // A's draft never adopted B's config.
    expect(wsA.draft.original.value.verbosity).toBe(1);

    await view
      .find('[data-file="root_login.rego"] [data-action="override"]')
      .trigger('click');
    await flushPromises();
    await view.find('[data-test="pending-review"]').trigger('click');
    await vi.dynamicImportSettled();
    await flushPromises();
    await view.find('[data-test="save-config"]').trigger('click');
    await flushPromises();
    expect(api.current.putConfig).toHaveBeenCalledTimes(1);
    const [id, body] = (api.current.putConfig as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(id).toBe('agent-2');
    expect(body.overlay.verbosity).toBe(2);
  });

  it('shows the read-only notice for readers', async () => {
    const wrapper = await mountPoliciesView({ agent: ['read'] });
    expect(wrapper.find('[data-test="policies-read-only"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-test="create-bundle"]').exists()).toBe(false);
  });
});
