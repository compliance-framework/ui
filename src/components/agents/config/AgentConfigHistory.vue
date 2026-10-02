<template>
  <div class="space-y-3" data-test="config-history">
    <p v-if="loading && !items.length" class="text-sm text-gray-500">
      Loading revisions…
    </p>
    <Message v-else-if="error && !items.length" severity="error">
      <div class="flex flex-wrap items-center gap-3">
        <span>{{ error }}</span>
        <SecondaryButton size="small" @click="reload">Retry</SecondaryButton>
      </div>
    </Message>
    <p
      v-else-if="!items.length"
      class="text-sm text-gray-500 dark:text-slate-400"
      data-test="history-empty"
    >
      No revisions yet.
    </p>
    <div
      v-else
      class="overflow-x-auto rounded-md border border-ccf-300 dark:border-slate-700"
    >
      <table class="w-full min-w-[760px] text-sm">
        <thead
          class="bg-gray-50 text-left text-xs tracking-wider text-gray-500 uppercase dark:bg-slate-800 dark:text-slate-400"
        >
          <tr>
            <th class="p-2">Rev</th>
            <th class="p-2">Author</th>
            <th class="p-2">When</th>
            <th class="p-2">Comment</th>
            <th class="p-2">Size</th>
            <th class="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in items"
            :key="r.revision"
            class="border-t border-ccf-300 align-top dark:border-slate-700"
            :data-rev="r.revision"
          >
            <td class="p-2 whitespace-nowrap">
              <span class="font-semibold">r{{ r.revision }}</span>
              <ConfigPill
                v-if="r.revision === desiredRevision"
                severity="success"
                class="ml-1"
                >Current</ConfigPill
              >
              <ConfigPill v-if="r.revertOf" severity="info" class="ml-1"
                >Revert of r{{ r.revertOf }}</ConfigPill
              >
            </td>
            <td class="p-2">{{ r.createdBy || '—' }}</td>
            <td class="p-2 whitespace-nowrap">
              <span v-tooltip.top="formatAbsolute(r.createdAt)">{{
                formatRelative(r.createdAt)
              }}</span>
            </td>
            <td class="p-2 break-words">{{ r.comment || '' }}</td>
            <td class="p-2 whitespace-nowrap">
              {{ humanBytes(r.overlaySize) }}
            </td>
            <td class="p-2">
              <div class="flex flex-wrap gap-1">
                <TertiaryButton
                  size="small"
                  data-test="history-view"
                  @click="view(r.revision)"
                  >View</TertiaryButton
                >
                <TertiaryButton
                  size="small"
                  data-test="history-diff-prev"
                  @click="diff(r.revision - 1, r.revision)"
                >
                  Diff with previous
                </TertiaryButton>
                <TertiaryButton
                  v-if="r.revision !== desiredRevision"
                  size="small"
                  data-test="history-diff-current"
                  @click="diff(r.revision, desiredRevision)"
                >
                  Diff with current
                </TertiaryButton>
                <span
                  v-if="r.revision !== desiredRevision"
                  v-tooltip.top="{
                    value: revertTooltip,
                    disabled: canRevert,
                  }"
                >
                  <TertiaryButton
                    size="small"
                    :disabled="!canRevert"
                    data-test="history-revert"
                    @click="openRevert(r.revision)"
                  >
                    Revert
                  </TertiaryButton>
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p
      v-if="error && items.length"
      class="text-sm text-red-600 dark:text-red-400"
      data-test="history-page-error"
    >
      {{ error }}
    </p>
    <div v-if="page < totalPages" class="flex justify-center">
      <SecondaryButton
        size="small"
        :disabled="loading"
        data-test="history-more"
        @click="loadMore"
      >
        Load more
      </SecondaryButton>
    </div>

    <!-- View -->
    <Dialog
      v-model:visible="viewOpen"
      modal
      :header="`Overlay r${viewRev}`"
      class="w-full max-w-4xl"
    >
      <p v-if="dialogLoading" class="text-sm text-gray-500">Loading…</p>
      <p
        v-else-if="dialogError"
        class="text-sm text-red-600"
        data-test="view-error"
      >
        {{ dialogError }}
      </p>
      <ConfigYamlViewer
        v-else-if="viewOpen"
        :doc="viewDoc"
        :filename="`${fileBase}-overlay-r${viewRev}.yaml`"
        empty-text="No overlay."
      />
    </Dialog>

    <!-- Diff -->
    <Dialog
      v-model:visible="diffOpen"
      modal
      :header="diffTitle"
      class="w-full max-w-5xl"
    >
      <p v-if="dialogLoading" class="text-sm text-gray-500">Loading…</p>
      <p v-else-if="dialogError" class="text-sm text-red-600">
        {{ dialogError }}
      </p>
      <CodeMergeView
        v-else-if="diffOpen"
        :original="diffOriginal"
        :modified="diffModified"
        language="yaml"
        mode="split"
      />
    </Dialog>

    <!-- Revert (ConfirmDialog has no input, so a small dialog asks for the comment) -->
    <Dialog
      v-model:visible="revertOpen"
      modal
      header="Revert configuration"
      class="w-full max-w-lg"
    >
      <div class="space-y-3" data-test="revert-dialog">
        <p class="text-sm">
          Create revision r{{ desiredRevision + 1 }} with the overlay of r{{
            revertRev
          }}? It is re-validated against the current instances.
        </p>
        <label
          class="block text-xs font-medium tracking-wide text-gray-500 uppercase"
          for="revert-comment"
        >
          Comment (optional)
        </label>
        <Textarea
          id="revert-comment"
          v-model="revertComment"
          :maxlength="LIMITS.commentChars"
          rows="2"
          class="w-full"
          data-test="revert-comment"
        />
        <div class="flex justify-end gap-2">
          <TertiaryButton @click="revertOpen = false">Cancel</TertiaryButton>
          <PrimaryButton
            :disabled="reverting"
            data-test="revert-confirm"
            @click="doRevert"
          >
            {{ reverting ? 'Reverting…' : `Revert to r${revertRev}` }}
          </PrimaryButton>
        </div>
      </div>
    </Dialog>

    <!-- 422 on revert: the old overlay may be invalid for today's bases -->
    <Dialog
      v-model:visible="invalidOpen"
      modal
      header="Revert rejected"
      class="w-full max-w-2xl"
    >
      <div class="space-y-2 text-sm" data-test="revert-invalid">
        <p>{{ invalidBody?.body }}</p>
        <ul class="space-y-1">
          <li
            v-for="(e, i) in invalidBody?.overlay ?? []"
            :key="`o${i}`"
            class="text-red-700 dark:text-red-300"
          >
            <code class="font-mono text-xs">{{ e.path || '/' }}</code> —
            {{ e.message }}
          </li>
          <template
            v-for="inst in invalidBody?.instances ?? []"
            :key="inst['instance-id']"
          >
            <li
              v-for="(e, i) in inst.errors"
              :key="`${inst['instance-id']}${i}`"
              class="text-red-700 dark:text-red-300"
            >
              {{ inst.hostname || inst['instance-id'] }}:
              <code class="font-mono text-xs">{{ e.path || '/' }}</code> —
              {{ e.message }}
            </li>
          </template>
        </ul>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import Dialog from '@/volt/Dialog.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import Textarea from '@/volt/Textarea.vue';
import { CodeMergeView } from '@/components/code-editor';
import type {
  AgentConfigRevision,
  AgentConfigRevisionSummary,
  ConfigErrorBody,
  OverlayDoc,
} from '@/types/agent-config';
import {
  isAgentConfigApiError,
  type AgentConfigApi,
} from '@/composables/agent-config/useAgentConfigApi';
import {
  formatAbsolute,
  formatRelative,
  humanBytes,
} from '@/utils/agent-config/display';
import { toYaml } from '@/utils/agent-config/yaml';
import { LIMITS } from '@/utils/agent-config/validation';
import ConfigPill from './ConfigPill.vue';
import ConfigYamlViewer from './ConfigYamlViewer.vue';

const PAGE_SIZE = 20;

const props = defineProps<{
  api: AgentConfigApi;
  agentId: string;
  fileBase: string;
  desiredRevision: number;
  /** Whether the user may revert (agent:configure). */
  canRevert: boolean;
  /** Why Revert is disabled when `canRevert` is false. */
  revertTooltip: string;
  /** Cached revision loader shared with the tab (U1.3). */
  getRevision: (rev: number) => Promise<AgentConfigRevision>;
}>();

const emit = defineEmits<{ changed: [] }>();

const toast = useToast();
const items = shallowRef<AgentConfigRevisionSummary[]>([]);
const page = ref(0);
const totalPages = ref(1);
const loading = ref(false);
const error = ref<string | null>(null);

const dialogLoading = ref(false);
const dialogError = ref<string | null>(null);
const viewOpen = ref(false);
const viewRev = ref(0);
const viewDoc = shallowRef<OverlayDoc | null>(null);
const diffOpen = ref(false);
const diffTitle = ref('');
const diffOriginal = ref('');
const diffModified = ref('');

const revertOpen = ref(false);
const revertRev = ref(0);
const revertComment = ref('');
const reverting = ref(false);
const invalidOpen = ref(false);
const invalidBody = shallowRef<ConfigErrorBody | null>(null);

let fetchSeq = 0;

async function fetchPage(p: number) {
  const seq = ++fetchSeq;
  loading.value = true;
  error.value = null;
  try {
    const res = await props.api.listRevisions(props.agentId, p, PAGE_SIZE);
    // A reload started meanwhile: drop this (possibly older) page.
    if (seq !== fetchSeq) return;
    // Revision 0 is never listed. Offsets shift when someone saves between pages, so merge
    // by revision (newest first) instead of appending duplicates.
    const rows = res.items.filter((r) => r.revision > 0);
    const merged = new Map(
      (p === 1 ? [] : items.value).map((r) => [r.revision, r]),
    );
    for (const r of rows) merged.set(r.revision, r);
    items.value = [...merged.values()].sort((a, b) => b.revision - a.revision);
    page.value = p;
    totalPages.value = res.totalPages;
  } catch (e) {
    if (seq !== fetchSeq) return;
    error.value = isAgentConfigApiError(e)
      ? e.message
      : 'Failed to load revisions.';
  } finally {
    if (seq === fetchSeq) loading.value = false;
  }
}

function reload() {
  return fetchPage(1);
}

function loadMore() {
  return fetchPage(page.value + 1);
}

async function overlayOf(rev: number): Promise<OverlayDoc> {
  if (rev <= 0) return {};
  return (await props.getRevision(rev)).overlay ?? {};
}

async function view(rev: number) {
  viewRev.value = rev;
  viewDoc.value = null;
  viewOpen.value = true;
  dialogLoading.value = true;
  dialogError.value = null;
  try {
    viewDoc.value = await overlayOf(rev);
  } catch (e) {
    // Never show a failed load as an empty overlay.
    dialogError.value = isAgentConfigApiError(e)
      ? e.message
      : 'Failed to load the revision.';
  } finally {
    dialogLoading.value = false;
  }
}

/** YAML diff of two revisions' overlays; r0 (and "before r1") is {}. */
async function diff(from: number, to: number) {
  diffTitle.value = `r${Math.max(from, 0)} → r${to}`;
  diffOpen.value = true;
  dialogLoading.value = true;
  dialogError.value = null;
  try {
    const [a, b] = await Promise.all([overlayOf(from), overlayOf(to)]);
    diffOriginal.value = toYaml(a);
    diffModified.value = toYaml(b);
  } catch (e) {
    dialogError.value = isAgentConfigApiError(e)
      ? e.message
      : 'Failed to load the revisions.';
  } finally {
    dialogLoading.value = false;
  }
}

function openRevert(rev: number) {
  if (!props.canRevert) return;
  revertRev.value = rev;
  revertComment.value = '';
  revertOpen.value = true;
}

async function doRevert() {
  reverting.value = true;
  const rev = revertRev.value;
  try {
    const res = await props.api.revert(
      props.agentId,
      rev,
      props.desiredRevision,
      revertComment.value,
    );
    revertOpen.value = false;
    if (res.created) {
      toast.add({
        severity: 'success',
        summary: 'Reverted',
        detail: `Reverted to r${rev} as r${res.revision.revision}`,
        life: 3000,
      });
    } else {
      toast.add({
        severity: 'info',
        summary: 'No change',
        detail: `Already equivalent to r${rev}; no new revision`,
        life: 4000,
      });
    }
    emit('changed');
    await reload();
  } catch (e) {
    if (isAgentConfigApiError(e) && e.kind === 'conflict') {
      revertOpen.value = false;
      toast.add({
        severity: 'warn',
        summary: 'Conflict',
        detail:
          'Configuration changed by someone else. Refreshed; please retry.',
        life: 5000,
      });
      emit('changed');
      await reload();
    } else if (isAgentConfigApiError(e) && e.kind === 'invalid') {
      revertOpen.value = false;
      invalidBody.value = e.body ?? { body: e.message };
      invalidOpen.value = true;
    } else {
      toast.add({
        severity: 'error',
        summary: 'Revert failed',
        detail: isAgentConfigApiError(e) ? e.message : 'The revert failed.',
        life: 5000,
      });
    }
  } finally {
    reverting.value = false;
  }
}

onMounted(reload);
// A save or revert elsewhere (e.g. the editor) moves the desired revision: reload the list.
watch(
  () => props.desiredRevision,
  (n, o) => {
    if (n !== o) reload();
  },
);

defineExpose({ reload });
</script>
