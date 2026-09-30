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
  extraStubs: Record<string, unknown> = {},
) {
  return {
    plugins: [pinia, PrimeVue, ToastService, ConfirmationService],
    directives: {
      tooltip: { mounted: () => undefined, updated: () => undefined },
    },
    stubs: {
      // CodeMirror is stubbed everywhere except its own spec.
      CodeEditor: {
        name: 'CodeEditor',
        props: ['modelValue', 'readonly', 'language', 'diagnostics', 'label'],
        emits: ['update:modelValue'],
        template:
          '<textarea class="code-editor-stub" :data-language="language" :readonly="readonly" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
      },
      CodeMergeView: {
        name: 'CodeMergeView',
        props: ['original', 'modified', 'language', 'mode'],
        template: '<div class="merge-stub">{{ original }}|{{ modified }}</div>',
      },
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
