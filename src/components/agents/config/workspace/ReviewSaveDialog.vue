<template>
  <Dialog
    :visible="visible"
    modal
    :header="`Review and save · base r${draft.baseRevision.value}`"
    class="w-full max-w-5xl"
    data-test="review-dialog"
    :closable="!saving"
    :close-on-escape="!saving && !childOpen"
    @update:visible="onVisible"
  >
    <div class="space-y-4">
      <p
        class="text-xs text-gray-500 dark:text-slate-400"
        data-test="secrets-notice"
      >
        <i class="pi pi-info-circle mr-1" />{{ OVERLAY_SECRETS_NOTICE }}
      </p>

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
            >. Your pending changes are based on r{{
              draft.baseRevision.value
            }}.
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
              Discard my changes and reload
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
              Keep my changes
            </PrimaryButton>
          </div>
        </div>
      </Message>

      <Message
        v-if="rebaseConflicts.length"
        severity="warn"
        data-test="rebase-conflicts"
      >
        Also changed by the other revision (your value is kept):
        <code
          v-for="(p, i) in rebaseConflicts"
          :key="p"
          class="font-mono text-xs"
          >{{ p }}{{ i < rebaseConflicts.length - 1 ? ', ' : '' }}</code
        >
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

      <p
        v-if="reviewLoading"
        class="text-sm text-gray-500 dark:text-slate-400"
        data-test="review-loading"
      >
        <i class="pi pi-spin pi-spinner mr-1" />Checking the pending changes
        against the agent's instances…
      </p>
      <Message
        v-else-if="reviewError"
        severity="error"
        data-test="review-error"
      >
        <div class="flex flex-wrap items-center gap-3">
          <span>{{ reviewError }}</span>
          <SecondaryButton size="small" @click="runReview(true)"
            >Retry</SecondaryButton
          >
        </div>
      </Message>
      <SavePreviewPanel
        v-else-if="ws.preview.lastPreview.value"
        v-model:comment="draft.comment.value"
        :preview="ws.preview.lastPreview.value"
        :instance-details="ws.instanceDetails.value"
        :current-overlay="draft.original.value"
        :draft-overlay="draft.overlay.value"
        :base-revision="draft.baseRevision.value"
        :saving="saving"
        :save-errors="saveErrors"
        :save-disabled-reason="saveDisabledReason"
        back-label="Keep editing"
        @back="onVisible(false)"
        @save="save"
        @child-open="panelChildOpen = $event"
      />
    </div>
  </Dialog>

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
// Review and save (R69): the existing preview UX (per-instance diff, safety tags, will-apply,
// R59 warnings) over the shared draft, saved as ONE revision with If-Match
// and the 409 flow. Opened from the pending-changes bar.
import { computed, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import Dialog from '@/volt/Dialog.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { CodeMergeView } from '@/components/code-editor';
import type {
  AgentConfigRevision,
  ConfigErrorBody,
} from '@/types/agent-config';
import { clone } from '@/utils/agent-config/merge-patch';
import { isAgentConfigApiError } from '@/composables/agent-config/api-types';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';
import { hasBlocking } from '@/utils/agent-config/validation';
import { formatRelative } from '@/utils/agent-config/display';
import { toYaml } from '@/utils/agent-config/yaml';
import SavePreviewPanel from '../editor/SavePreviewPanel.vue';
import { OVERLAY_SECRETS_NOTICE } from '../constants';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ 'update:visible': [v: boolean] }>();

const ws = useWorkspace()!;
const draft = ws.draft;
const toast = useToast();

const reviewLoading = ref(false);
const reviewError = ref<string | null>(null);
const saving = ref(false);
const saveError = ref<string | null>(null);
const saveErrors = ref<ConfigErrorBody | null>(null);
const conflict = ref<{
  currentRevision: number;
  latest: AgentConfigRevision | null;
} | null>(null);
const theirChangesOpen = ref(false);
/** Pointers both this draft and the other revision changed ("Keep my changes"). */
const rebaseConflicts = ref<string[]>([]);
const panelChildOpen = ref(false);
// PrimeVue closes every open dialog on Esc: keep this one open while a nested one is.
const childOpen = computed(
  () => theirChangesOpen.value || panelChildOpen.value,
);

const saveDisabledReason = computed(() =>
  conflict.value ? 'Resolve the conflict first' : ws.saveDisabledReason.value,
);

/** @param force run a fresh preview even if the cached one matches the draft. */
async function runReview(force = false) {
  reviewError.value = null;
  saveErrors.value = null;
  if (hasBlocking(draft.clientIssues.value)) {
    reviewError.value = 'Fix the problems listed in the pending changes first.';
    return;
  }
  if (!force && ws.preview.isCurrent()) return;
  reviewLoading.value = true;
  try {
    await ws.preview.run();
  } catch (e) {
    reviewError.value = isAgentConfigApiError(e)
      ? e.message
      : 'The check failed.';
  } finally {
    reviewLoading.value = false;
  }
}

watch(
  () => props.visible,
  (v) => {
    if (!v) return;
    saveError.value = null;
    // The review needs every instance's file for its diff.
    if (!ws.detailsLoaded.value && !ws.detailsLoading.value) ws.loadDetails();
    runReview();
  },
  { immediate: true },
);

// 422 details describe the draft that was sent; drop them once it changes.
watch(draft.overlay, () => {
  saveErrors.value = null;
});

function onVisible(v: boolean) {
  emit('update:visible', v);
}

async function save(comment: string) {
  saving.value = true;
  saveError.value = null;
  saveErrors.value = null;
  // The draft can change while the save is in flight; onSaved compares against this.
  const sent = clone(draft.overlay.value);
  try {
    const result = await ws.api.putConfig(
      ws.agentId.value,
      { overlay: sent, comment },
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
    emit('update:visible', false);
    await ws.onSaved(result, sent);
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
        const latest = await ws.api
          .getConfig(ws.agentId.value)
          .catch(() => null);
        conflict.value = {
          currentRevision:
            e.currentRevision ?? latest?.revision ?? draft.baseRevision.value,
          latest,
        };
        break;
      }
      case 'invalid':
        saveErrors.value = e.body ?? { body: e.message };
        break;
      case 'forbidden':
      case 'too-large':
        saveError.value = e.message;
        break;
      default:
        saveError.value = `${e.message} Your changes are kept; try again.`;
    }
  } finally {
    saving.value = false;
  }
}

async function reloadLatest() {
  if (!conflict.value) return;
  const latest = await ws.api.getConfig(ws.agentId.value).catch(() => null);
  if (latest && conflict.value) {
    conflict.value = { currentRevision: latest.revision, latest };
  } else {
    saveError.value = 'Could not load the latest configuration; try again.';
  }
}

async function resolveConflict(keep: boolean) {
  const latest = conflict.value?.latest;
  if (!latest) return;
  const both = draft.rebase(latest, keep);
  rebaseConflicts.value = keep ? both : [];
  conflict.value = null;
  saveErrors.value = null;
  if (keep) {
    // A fresh preview against the latest revision; the user then saves over it.
    await runReview(true);
  } else {
    emit('update:visible', false);
    await ws.state.refresh();
  }
}

defineExpose({ save, runReview, conflict });
</script>
