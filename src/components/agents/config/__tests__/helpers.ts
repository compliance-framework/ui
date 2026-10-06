import PrimeVue from 'primevue/config';

// PrimeVue overlays (Select, Dialog) query matchMedia, which jsdom lacks.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
import ToastService from 'primevue/toastservice';
import { RouterLinkStub } from '@vue/test-utils';
import ConfirmationService from 'primevue/confirmationservice';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { usePermissionsStore } from '@/stores/permissions';

/** A pinia whose permission store is hydrated with `permissions`. */
export function piniaWith(permissions: Record<string, string[]>): Pinia {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = usePermissionsStore();
  store.permissions = permissions;
  store.loaded = true;
  return pinia;
}

export function globalWith(
  pinia: Pinia,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraStubs: Record<string, any> = {},
) {
  return {
    plugins: [pinia, PrimeVue, ToastService, ConfirmationService],
    directives: {
      tooltip: { mounted: () => undefined, updated: () => undefined },
    },
    stubs: {
      // CodeMirror: specs that render editors mock '@/components/code-editor' with
      // ./codeEditorMock (sync stand-ins); only CodeEditor.spec mounts the real editor.
      RouterLink: RouterLinkStub,
      ...extraStubs,
    },
  };
}

export const ADMIN = {
  admin: ['manage'],
  agent: ['read', 'configure'],
};
export const READER = { agent: ['read'] };

// ---- Workspace harness: a real useAgentConfig + useConfigWorkspace over a fake API ----
import { computed, defineComponent, h, watch, type Component } from 'vue';
import { vi } from 'vitest';
import type {
  AgentConfigApi,
  InstancesPageQuery,
} from '@/composables/agent-config/api-types';
import type {
  AgentInstanceSummary,
  InstanceCounts,
} from '@/types/agent-config';
import { useAgentConfig } from '@/composables/agent-config/useAgentConfig';
import {
  useConfigWorkspace,
  type ConfigWorkspace,
} from '@/composables/agent-config/useConfigWorkspace';
import {
  configRev7,
  detailFor,
  instanceDetailA,
  instanceIds,
  instancesMixed,
} from '@/composables/agent-config/__tests__/fixtures';

/**
 * A listInstances that serves `items` as the paginated API does: `limit` (default 25) a page,
 * page fields in meta, and counts over every item.
 */
export function pagedListInstances(items: AgentInstanceSummary[]) {
  const counts: InstanceCounts = {
    total: items.length,
    fresh: items.filter((i) => !i.stale).length,
    stale: items.filter((i) => i.stale).length,
    inSync: items.filter((i) => i.syncStatus === 'in-sync').length,
    outOfSync: items.filter((i) => i.syncStatus === 'out-of-sync').length,
    pending: items.filter((i) => i.status === 'pending').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
    failed: items.filter((i) => i.status === 'failed').length,
    unknown: items.filter((i) => i.status === 'unknown').length,
  };
  return vi.fn(async (_agentId: string, q: InstancesPageQuery = {}) => {
    const page = q.page ?? 1;
    const limit = q.limit ?? 25;
    return {
      items: items.slice((page - 1) * limit, page * limit),
      meta: {
        desiredRevision: instancesMixed.meta.desiredRevision,
        counts,
        page,
        limit,
        total: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / limit)),
      },
    };
  });
}

/** A fake API backed by the fixtures; override any method. */
export function fakeApi(over: Partial<AgentConfigApi> = {}): AgentConfigApi {
  return {
    getConfig: vi.fn().mockResolvedValue(configRev7),
    putConfig: vi.fn(),
    preview: vi.fn(),
    listRevisions: vi
      .fn()
      .mockResolvedValue({ items: [], total: 0, totalPages: 1 }),
    getRevision: vi.fn().mockResolvedValue(configRev7),
    revert: vi.fn(),
    listInstances: pagedListInstances(instancesMixed.items),
    getInstance: vi.fn().mockImplementation(async (_a: string, id: string) => {
      if (id === instanceIds.a) return instanceDetailA;
      const s = instancesMixed.items.find((i) => i.instanceId === id)!;
      return detailFor(s, configRev7.overlay ?? {});
    }),
    ...over,
  };
}

/**
 * A host component that loads the agent config and provides a workspace to `inner`
 * (rendered with `props` once the configuration is ready). `out.ws` exposes the workspace.
 * Like the Configuration tab, it loads every instance's detail for editors.
 */
export function workspaceHost(
  api: AgentConfigApi,
  inner: Component,
  props: () => Record<string, unknown> = () => ({}),
  out: { ws?: ConfigWorkspace } = {},
  agentId = 'agent-1',
) {
  return defineComponent({
    name: 'WorkspaceHost',
    setup() {
      const state = useAgentConfig(
        computed(() => agentId),
        api,
      );
      const ws = useConfigWorkspace(agentId, api, state);
      out.ws = ws;
      // As the Configuration tab does: editors load every reporting instance's file.
      watch(
        () =>
          state.status.value === 'ready' &&
          !state.instanceLoading.value &&
          ws.canConfigure.value,
        (go) => {
          if (go && !ws.detailsLoaded.value && !ws.detailsLoading.value)
            ws.loadDetails();
        },
        { immediate: true },
      );
      state.load();
      return () =>
        state.status.value === 'ready'
          ? h(inner, props())
          : h('div', 'loading');
    },
  });
}
