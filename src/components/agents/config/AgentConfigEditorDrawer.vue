<template>
  <Drawer
    :visible="visible"
    position="right"
    class="w-screen! max-w-5xl!"
    :block-scroll="true"
    data-test="config-drawer"
    @update:visible="onVisibleChange"
  >
    <template #header>
      <div class="flex flex-wrap items-center gap-4">
        <h2 class="text-xl font-semibold">
          Edit configuration · base r{{ draft.baseRevision.value }}
        </h2>
        <span
          v-if="step === 'edit'"
          v-tooltip.bottom="{
            value: 'Fix YAML errors first',
            disabled: !draft.yamlError.value,
          }"
        >
          <SelectButton
            :model-value="draft.mode.value"
            :options="modeOptions"
            option-label="label"
            option-value="value"
            option-disabled="disabled"
            :allow-empty="false"
            aria-label="Editor mode"
            data-test="editor-mode"
            @update:model-value="setMode"
          />
        </span>
      </div>
    </template>

    <div class="space-y-4">
      <EditorBanner
        :policy-only="editorMode === 'policy-only'"
        :preview-status="preview.status.value"
        :blocking-count="blockingCount"
        :details-loading="detailsLoading"
        @retry="preview.retry()"
      />

      <Message v-if="conflict" severity="warn" data-test="conflict-banner">
        <div class="space-y-2">
          <p>
            r{{ conflict.currentRevision }} was saved
            <template v-if="conflict.latest?.createdBy"
              >by {{ conflict.latest.createdBy }}</template
            >
            <template v-if="conflict.latest?.createdAt">{{
              ' ' + formatRelative(conflict.latest.createdAt)
            }}</template
            >. Your draft is based on r{{ draft.baseRevision.value }}.
          </p>
          <div class="flex flex-wrap gap-2">
            <SecondaryButton
              size="small"
              :disabled="!conflict.latest"
              data-test="conflict-view"
              @click="theirChangesOpen = true"
            >
              View their changes
            </SecondaryButton>
            <SecondaryButton
              size="small"
              :disabled="!conflict.latest"
              data-test="conflict-discard"
              @click="resolveConflict(false)"
            >
              Discard my draft and reload
            </SecondaryButton>
            <SecondaryButton
              v-if="!conflict.latest"
              size="small"
              data-test="conflict-reload"
              @click="reloadLatest"
            >
              Reload latest
            </SecondaryButton>
            <PrimaryButton
              size="small"
              :disabled="!conflict.latest"
              data-test="conflict-keep"
              @click="resolveConflict(true)"
            >
              Keep my draft
            </PrimaryButton>
          </div>
        </div>
      </Message>

      <Message v-if="saveError" severity="error" data-test="save-error">
        <div class="flex flex-wrap items-center gap-3">
          <span>{{ saveError }}</span>
          <SecondaryButton
            size="small"
            :disabled="saving"
            @click="saveError = null"
            >Dismiss</SecondaryButton
          >
        </div>
      </Message>

      <template v-if="step === 'edit'">
        <OverlayFormEditor v-if="draft.mode.value === 'form'">
          <template #policies>
            <PoliciesSection />
          </template>
        </OverlayFormEditor>
        <OverlayYamlEditor v-else />
      </template>

      <template v-else>
        <p
          v-if="reviewLoading"
          class="text-sm text-gray-500"
          data-test="review-loading"
        >
          <i class="pi pi-spin pi-spinner mr-1" />Checking the draft against the
          agent's instances…
        </p>
        <Message
          v-else-if="reviewError"
          severity="error"
          data-test="review-error"
        >
          <div class="flex flex-wrap items-center gap-3">
            <span>{{ reviewError }}</span>
            <SecondaryButton size="small" @click="goReview(true)"
              >Retry</SecondaryButton
            >
            <SecondaryButton size="small" @click="step = 'edit'"
              >Back</SecondaryButton
            >
          </div>
        </Message>
        <SavePreviewPanel
          v-else-if="preview.lastPreview.value"
          :preview="preview.lastPreview.value"
          :instance-details="instanceDetails"
          :current-overlay="draft.original.value"
          :draft-overlay="draft.overlay.value"
          :base-revision="draft.baseRevision.value"
          :saving="saving"
          :save-errors="saveErrors"
          v-model:comment="comment"
          :save-disabled-reason="saveDisabledReason"
          @back="step = 'edit'"
          @save="save"
        />
      </template>
    </div>

    <template #footer>
      <div class="flex flex-wrap items-center gap-2">
        <TertiaryButton
          data-test="drawer-cancel"
          @click="onVisibleChange(false)"
          >Cancel</TertiaryButton
        >
        <span
          v-if="step === 'edit' && originalNonEmpty"
          v-tooltip.top="{
            value: permissionTooltip(RESOURCES.AGENT, ACTIONS.CONFIGURE),
            disabled: canConfigure,
          }"
        >
          <Button
            severity="danger"
            size="small"
            :disabled="!canConfigure"
            data-test="clear-overlay"
            @click="confirmClear"
          >
            Clear overlay
          </Button>
        </span>
        <span class="flex-1" />
        <PrimaryButton
          v-if="step === 'edit'"
          :disabled="!canReview"
          data-test="review-changes"
          @click="goReview()"
        >
          Review changes
        </PrimaryButton>
      </div>
    </template>
  </Drawer>

  <Dialog
    v-model:visible="theirChangesOpen"
    modal
    header="Their changes"
    class="w-full max-w-5xl"
  >
    <CodeMergeView
      v-if="theirChangesOpen && conflict?.latest"
      :original="toYaml(draft.original.value)"
      :modified="toYaml(conflict.latest.overlay ?? {})"
      language="yaml"
      mode="split"
    />
  </Dialog>
</template>

<script setup lang="ts">
import {
  computed,
  inject,
  onBeforeUnmount,
  provide,
  ref,
  toRef,
  watch,
} from 'vue';
import { matchedRouteKey, onBeforeRouteLeave } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import Button from '@/volt/Button.vue';
import Dialog from '@/volt/Dialog.vue';
import Drawer from '@/volt/Drawer.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import SelectButton from '@/volt/SelectButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { CodeMergeView } from '@/components/code-editor';
import type { Agent } from '@/types/agents';
import type {
  AgentConfigRevision,
  AgentInstanceDetail,
  AgentInstanceSummary,
  ConfigDoc,
  ConfigErrorBody,
  PolicyBundleDoc,
  PolicyError,
  SaveResult,
} from '@/types/agent-config';
import { usePermissions } from '@/composables/usePermissions';
import {
  isAgentConfigApiError,
  useAgentConfigApi,
} from '@/composables/agent-config/useAgentConfigApi';
import { useOverlayDraft } from '@/composables/agent-config/useOverlayDraft';
import { usePreview } from '@/composables/agent-config/usePreview';
import {
  EDITOR_CONTEXT_KEY,
  EDITOR_PERMISSIONS_KEY,
  OVERLAY_DRAFT_KEY,
  type EditorContext,
  type EditorMode,
} from '@/composables/agent-config/editorContext';
import {
  hasBlocking,
  type ValidationContext,
} from '@/utils/agent-config/validation';
import {
  isPolicyOnlyChange,
  vendorFilesFor,
} from '@/utils/agent-config/policy-files';
import { isPlainObject } from '@/utils/agent-config/merge-patch';
import { formatRelative } from '@/utils/agent-config/display';
import { toYaml } from '@/utils/agent-config/yaml';
import EditorBanner from './editor/EditorBanner.vue';
import OverlayFormEditor from './editor/OverlayFormEditor.vue';
import OverlayYamlEditor from './editor/OverlayYamlEditor.vue';
import SavePreviewPanel from './editor/SavePreviewPanel.vue';
import PoliciesSection from './editor/PoliciesSection.vue';

const props = defineProps<{
  visible: boolean;
  agent: Agent;
  config: AgentConfigRevision;
  instances: AgentInstanceSummary[];
  instanceDetails: Map<string, AgentInstanceDetail>;
  /** The instance selected in the tab: its file values are the placeholders. */
  initialInstanceId: string | null;
  detailsLoading?: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  saved: [result: SaveResult];
}>();

const api = useAgentConfigApi();
const toast = useToast();
const confirm = useConfirm();
const { can, permissionTooltip, RESOURCES, ACTIONS } = usePermissions();

// ---- Permissions (U2.7) ----
const canConfigure = computed(() => can(RESOURCES.AGENT, ACTIONS.CONFIGURE));
const editorMode = computed<EditorMode>(() =>
  canConfigure.value ? 'full' : 'policy-only',
);
provide(EDITOR_PERMISSIONS_KEY, { mode: editorMode });

// ---- Context ----
const agentId = toRef(() => props.agent.id);
const instancesRef = toRef(() => props.instances);
const detailsRef = toRef(() => props.instanceDetails);
// The revision the draft is based on; follows a 409 rebase (desired revision, bundle ages).
const configRef = ref<AgentConfigRevision>(props.config);
const placeholderInstanceId = ref<string | null>(
  props.initialInstanceId &&
    props.instanceDetails.get(props.initialInstanceId)?.base
    ? props.initialInstanceId
    : (Array.from(props.instanceDetails.values()).find((d) => d.base)
        ?.instanceId ?? props.initialInstanceId),
);
watch(detailsRef, (m) => {
  if (
    !placeholderInstanceId.value ||
    !m.get(placeholderInstanceId.value)?.base
  ) {
    placeholderInstanceId.value =
      Array.from(m.values()).find((d) => d.base)?.instanceId ??
      placeholderInstanceId.value;
  }
});
const placeholderDetail = computed(() =>
  placeholderInstanceId.value
    ? (props.instanceDetails.get(placeholderInstanceId.value) ?? null)
    : null,
);
const placeholderBase = computed<ConfigDoc | null>(
  () => placeholderDetail.value?.base ?? null,
);
const bases = computed<ConfigDoc[]>(() =>
  Array.from(props.instanceDetails.values())
    .map((d) => d.base)
    .filter((b): b is ConfigDoc => !!b),
);
const validationContext = computed<ValidationContext>(() => ({
  vendorPackages: (bundle: string) => {
    const b = draft.effectiveDraft.value.policy_bundles?.[bundle];
    const files = vendorFilesFor(
      bundle,
      isPlainObject(b) ? (b as PolicyBundleDoc) : null,
      placeholderDetail.value?.policyBundles ?? null,
    );
    return files
      ? files.map((f) => f.package).filter((p): p is string => !!p)
      : null;
  },
}));

const draft = useOverlayDraft(props.config, placeholderBase, {
  bases,
  validationContext,
});
provide(OVERLAY_DRAFT_KEY, draft);

const step = ref<'edit' | 'review'>('edit');
const blockingCount = computed(
  () => draft.clientIssues.value.filter((i) => i.blocking).length,
);
const canPreview = computed(
  () =>
    step.value === 'edit' &&
    !draft.yamlError.value &&
    !hasBlocking(draft.clientIssues.value),
);
const preview = usePreview(agentId, draft.overlay, api, canPreview);
const savePolicyErrors = ref<PolicyError[]>([]);

// 422 details describe the draft that was sent; drop them once it changes.
watch(
  () => draft.overlay.value,
  () => {
    savePolicyErrors.value = [];
    saveErrors.value = null;
  },
);

const ctx: EditorContext = {
  agentId,
  config: configRef,
  instances: instancesRef,
  instanceDetails: detailsRef,
  placeholderInstanceId,
  placeholderBase,
  bases,
  lastPreview: preview.lastPreview,
  savePolicyErrors,
};
provide(EDITOR_CONTEXT_KEY, ctx);

// ---- Mode switch ----
const modeOptions = computed(() => [
  {
    label: 'Form',
    value: 'form',
    disabled: draft.mode.value === 'yaml' && !!draft.yamlError.value,
  },
  { label: 'YAML', value: 'yaml', disabled: false },
]);
function setMode(next: 'form' | 'yaml') {
  if (!next) return;
  draft.setMode(next);
}

// ---- Review / save ----
const reviewLoading = ref(false);
const reviewError = ref<string | null>(null);
const saving = ref(false);
// Lives here (not in the review panel) so a conflict round-trip keeps it.
const comment = ref('');
const saveError = ref<string | null>(null);
const saveErrors = ref<ConfigErrorBody | null>(null);
const conflict = ref<{
  currentRevision: number;
  latest: AgentConfigRevision | null;
} | null>(null);
const theirChangesOpen = ref(false);
let closing = false;

const originalNonEmpty = computed(
  () => Object.keys(draft.original.value).length > 0,
);
const canReview = computed(
  () =>
    draft.isDirty.value && !draft.yamlError.value && blockingCount.value === 0,
);

/**
 * The bases a save validates against (R48): the previewed `validated` instances when known,
 * else fresh apply-mode instances, else every known base. Used for the advisory policy-only
 * check (the API decides).
 */
const policyBases = computed<ConfigDoc[]>(() => {
  const p = preview.lastPreview.value;
  const pick = (ids: string[]) =>
    ids
      .map((id) => props.instanceDetails.get(id)?.base)
      .filter((b): b is ConfigDoc => !!b);
  if (p && p.instances.some((i) => i.validated !== undefined)) {
    return pick(
      p.instances.filter((i) => i.validated).map((i) => i.instanceId),
    );
  }
  const fresh = pick(
    props.instances
      .filter(
        (i) => !i.stale && (i.mode === 'apply_safe' || i.mode === 'apply_all'),
      )
      .map((i) => i.instanceId),
  );
  return fresh.length ? fresh : bases.value;
});
const saveDisabledReason = computed(() => {
  if (conflict.value) return 'Resolve the conflict first';
  if (editorMode.value === 'full') return '';
  return isPolicyOnlyChange(
    policyBases.value,
    draft.original.value,
    draft.overlay.value,
  )
    ? ''
    : 'Your role can only change policy bundles and inline references';
});

/** @param force run a fresh preview even if the cached one matches the draft. */
async function goReview(force = false) {
  if (draft.mode.value === 'yaml' && !draft.flushYaml()) return;
  if (draft.yamlError.value || hasBlocking(draft.clientIssues.value)) return;
  step.value = 'review';
  reviewError.value = null;
  saveErrors.value = null;
  savePolicyErrors.value = [];
  if (!force && preview.isCurrent()) return;
  reviewLoading.value = true;
  try {
    await preview.run();
  } catch (e) {
    reviewError.value = isAgentConfigApiError(e)
      ? e.message
      : 'The check failed.';
  } finally {
    reviewLoading.value = false;
  }
}

async function save(comment: string) {
  saving.value = true;
  saveError.value = null;
  saveErrors.value = null;
  try {
    const result = await api.putConfig(
      props.agent.id,
      { overlay: draft.overlay.value, comment },
      draft.baseRevision.value,
    );
    if (result.created) {
      toast.add({
        severity: 'success',
        summary: 'Configuration saved',
        detail: `Configuration saved (r${result.revision.revision})`,
        life: 3000,
      });
    } else {
      toast.add({
        severity: 'info',
        summary: 'No change',
        detail: `No effective change; revision r${result.revision.revision} is unchanged`,
        life: 4000,
      });
    }
    closing = true;
    emit('saved', result);
    emit('update:visible', false);
  } catch (e) {
    if (!isAgentConfigApiError(e)) {
      saveError.value = 'The configuration could not be saved.';
      return;
    }
    switch (e.kind) {
      case 'conflict': {
        toast.add({
          severity: 'warn',
          summary: 'Conflict',
          detail: 'Configuration changed by someone else',
          life: 4000,
        });
        const latest = await api.getConfig(props.agent.id).catch(() => null);
        conflict.value = {
          currentRevision:
            e.currentRevision ?? latest?.revision ?? draft.baseRevision.value,
          latest,
        };
        break;
      }
      case 'invalid':
        saveErrors.value = e.body ?? { body: e.message };
        savePolicyErrors.value = e.body?.['policy-errors'] ?? [];
        break;
      case 'forbidden':
        saveError.value =
          editorMode.value === 'policy-only'
            ? `${e.message} Only policy bundles and inline: references can be changed with your role.`
            : e.message;
        break;
      case 'too-large':
        saveError.value =
          'The configuration is too large (limit 2 MiB with policy bundles).';
        break;
      default:
        saveError.value = `${e.message} Your draft is kept; try again.`;
    }
  } finally {
    saving.value = false;
  }
}

async function reloadLatest() {
  if (!conflict.value) return;
  const latest = await api.getConfig(props.agent.id).catch(() => null);
  if (latest && conflict.value) {
    conflict.value = { currentRevision: latest.revision, latest };
  } else {
    saveError.value = 'Could not load the latest configuration; try again.';
  }
}

async function resolveConflict(keep: boolean) {
  const latest = conflict.value?.latest;
  if (!latest) return;
  draft.rebase(latest, keep);
  configRef.value = latest;
  conflict.value = null;
  saveErrors.value = null;
  if (keep) {
    // Back to Review with a fresh preview; the user then saves over the latest revision.
    await goReview(true);
  } else {
    step.value = 'edit';
  }
}

function confirmClear() {
  confirm.require({
    header: 'Clear overlay',
    message:
      `Every agent instance returns to its local configuration. This creates revision r${draft.baseRevision.value + 1}.` +
      (draft.isDirty.value
        ? ' Your unsaved edits in this editor are discarded too.'
        : ''),
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Clear overlay', severity: 'danger' },
    accept: async () => {
      draft.replaceAll({});
      await goReview();
    },
  });
}

// ---- Dirty close guard ----
function askDiscard(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: boolean) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    confirm.require({
      header: 'Discard changes?',
      message: 'Your unsaved configuration changes will be lost.',
      rejectProps: {
        label: 'Keep editing',
        severity: 'secondary',
        outlined: true,
      },
      acceptProps: { label: 'Discard', severity: 'danger' },
      accept: () => done(true),
      reject: () => done(false),
      onHide: () => done(false),
    });
  });
}

async function onVisibleChange(value: boolean) {
  if (value) {
    emit('update:visible', true);
    return;
  }
  if (!closing && draft.hasUnsavedChanges.value) {
    if (!(await askDiscard())) return;
  }
  closing = true;
  emit('update:visible', false);
}

function beforeUnload(e: BeforeUnloadEvent) {
  e.preventDefault();
  e.returnValue = '';
}
watch(
  () => draft.hasUnsavedChanges.value,
  (dirty) => {
    if (dirty) window.addEventListener('beforeunload', beforeUnload);
    else window.removeEventListener('beforeunload', beforeUnload);
  },
  { immediate: true },
);

// Only inside a routed view (not in isolated component tests).
if (inject(matchedRouteKey, null)) {
  onBeforeRouteLeave(() =>
    closing || !draft.hasUnsavedChanges.value ? true : askDiscard(),
  );
}

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload);
  draft.dispose();
});

defineExpose({ draft, step, goReview, save });
</script>
