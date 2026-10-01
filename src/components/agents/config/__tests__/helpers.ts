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
  agent: ['read', 'configure', 'configure-policy'],
};
export const READER = { agent: ['read'] };
export const POLICY_AUTHOR = { agent: ['read', 'configure-policy'] };

// ---- Editor harness: provide a draft + context + permissions to editor sections ----
import { computed, ref, shallowRef } from 'vue';
import type {
  AgentConfigRevision,
  AgentInstanceDetail,
  AgentInstanceSummary,
  ConfigDoc,
  ConfigPreview,
  OverlayDoc,
  PolicyError,
} from '@/types/agent-config';
import { useOverlayDraft } from '@/composables/agent-config/useOverlayDraft';
import {
  EDITOR_CONTEXT_KEY,
  EDITOR_PERMISSIONS_KEY,
  OVERLAY_DRAFT_KEY,
  type EditorContext,
  type EditorMode,
} from '@/composables/agent-config/editorContext';

export function editorHarness(opts: {
  overlay?: OverlayDoc;
  revision?: number;
  instances: AgentInstanceSummary[];
  details: AgentInstanceDetail[];
  preview?: ConfigPreview | null;
  mode?: EditorMode;
  placeholderInstanceId?: string | null;
}) {
  const config: AgentConfigRevision = {
    agentId: 'agent-1',
    revision: opts.revision ?? 7,
    overlay: opts.overlay ?? {},
    overlaySize: 2,
    comment: null,
    createdBy: null,
    createdAt: null,
    revertOf: null,
  };
  const details = new Map(opts.details.map((d) => [d.instanceId, d]));
  const placeholderInstanceId = ref<string | null>(
    opts.placeholderInstanceId ?? opts.details[0]?.instanceId ?? null,
  );
  const placeholderBase = computed<ConfigDoc | null>(
    () =>
      (placeholderInstanceId.value &&
        details.get(placeholderInstanceId.value)?.base) ||
      null,
  );
  const bases = computed(() =>
    opts.details.map((d) => d.base).filter((b): b is ConfigDoc => !!b),
  );
  const draft = useOverlayDraft(config, placeholderBase, { bases });
  const ctx: EditorContext = {
    agentId: ref('agent-1'),
    config: ref(config),
    instances: ref(opts.instances),
    instanceDetails: shallowRef(details),
    placeholderInstanceId,
    placeholderBase,
    bases,
    lastPreview: shallowRef(opts.preview ?? null),
    savePolicyErrors: ref<PolicyError[]>([]),
  };
  const mode = computed<EditorMode>(() => opts.mode ?? 'full');
  return {
    draft,
    ctx,
    provide: {
      [OVERLAY_DRAFT_KEY as symbol]: draft,
      [EDITOR_CONTEXT_KEY as symbol]: ctx,
      [EDITOR_PERMISSIONS_KEY as symbol]: { mode },
    },
  };
}

// ---- Workspace harness: a real useAgentConfig + useConfigWorkspace over a fake API ----
import { defineComponent, h, type Component } from 'vue';
import { vi } from 'vitest';
import type { AgentConfigApi } from '@/composables/agent-config/api-types';
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
    listInstances: vi.fn().mockResolvedValue(instancesMixed),
    getInstance: vi.fn().mockImplementation(async (_a: string, id: string) => {
      if (id === instanceIds.a) return instanceDetailA;
      const s = instancesMixed.items.find((i) => i.instanceId === id)!;
      return detailFor(s, configRev7.overlay ?? {});
    }),
    listArtifactFiles: vi.fn(),
    getArtifactFile: vi.fn(),
    ...over,
  };
}

/**
 * A host component that loads the agent config and provides a workspace to `inner`
 * (rendered with `props` once the configuration is ready). `out.ws` exposes the workspace.
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
      state.load();
      return () =>
        state.status.value === 'ready'
          ? h(inner, props())
          : h('div', 'loading');
    },
  });
}
