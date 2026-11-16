<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue';
import { useToast } from '@/ds/toasts';
import Button from '@/ds/components/Button/Button.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { CodeMergeView } from '@/ds/components/CodeEditor';
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
import ConfigYamlViewer from './ConfigYamlViewer.vue';

const PAGE_SIZE = 20;

const columns: DataTableColumn[] = [
  { key: 'revision', label: 'Revision', nowrap: true },
  { key: 'createdBy', label: 'Author' },
  { key: 'createdAt', label: 'When', nowrap: true },
  { key: 'comment', label: 'Comment', minWidth: 'md' },
  { key: 'overlaySize', label: 'Size', nowrap: true, align: 'end' },
];

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
/** View / Diff share the dialog state: only the latest call may write it. */
let dialogSeq = 0;

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

/** A new View / Diff: older loads still in flight are dropped (see dialogSeq). */
function startDialog(): number {
  viewDoc.value = null;
  diffOriginal.value = '';
  diffModified.value = '';
  dialogError.value = null;
  dialogLoading.value = true;
  return ++dialogSeq;
}

async function view(rev: number) {
  const seq = startDialog();
  viewRev.value = rev;
  viewOpen.value = true;
  try {
    const doc = await overlayOf(rev);
    if (seq !== dialogSeq) return;
    viewDoc.value = doc;
  } catch (e) {
    if (seq !== dialogSeq) return;
    // Never show a failed load as an empty overlay.
    dialogError.value = isAgentConfigApiError(e)
      ? e.message
      : 'Failed to load the revision.';
  } finally {
    if (seq === dialogSeq) dialogLoading.value = false;
  }
}

/** YAML diff of two revisions' overlays; r0 (and "before r1") is {}. */
async function diff(from: number, to: number) {
  const seq = startDialog();
  diffTitle.value = `r${Math.max(from, 0)} → r${to}`;
  diffOpen.value = true;
  try {
    const [a, b] = await Promise.all([overlayOf(from), overlayOf(to)]);
    if (seq !== dialogSeq) return;
    diffOriginal.value = toYaml(a);
    diffModified.value = toYaml(b);
  } catch (e) {
    if (seq !== dialogSeq) return;
    dialogError.value = isAgentConfigApiError(e)
      ? e.message
      : 'Failed to load the revisions.';
  } finally {
    if (seq === dialogSeq) dialogLoading.value = false;
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

<template>
  <Stack gap="3" data-test="config-history">
    <Text v-if="loading && !items.length" variant="secondary">
      Loading revisions…
    </Text>
    <InlineMessage v-else-if="error && !items.length" tone="error">
      <Cluster gap="3">
        <span>{{ error }}</span>
        <Button size="sm" @click="reload">Retry</Button>
      </Cluster>
    </InlineMessage>
    <Text
      v-else-if="!items.length"
      variant="secondary"
      data-test="history-empty"
    >
      No revisions yet.
    </Text>
    <DataTable
      v-else
      caption="Configuration revisions"
      caption-hidden
      :columns="columns"
      :rows="items"
      :row-key="(r) => String(r.revision)"
    >
      <template #cell-revision="{ row }">
        <Cluster gap="1" as="span" :data-rev="row.revision">
          <strong>r{{ row.revision }}</strong>
          <Tag v-if="row.revision === desiredRevision" label="Current" />
          <Tag v-if="row.revertOf" :label="`Revert of r${row.revertOf}`" />
        </Cluster>
      </template>
      <template #cell-createdBy="{ row }">{{ row.createdBy || '—' }}</template>
      <template #cell-createdAt="{ row }">
        <time
          :datetime="row.createdAt ?? undefined"
          :title="formatAbsolute(row.createdAt)"
          >{{ formatRelative(row.createdAt) }}</time
        >
      </template>
      <template #cell-comment="{ row }">{{ row.comment || '' }}</template>
      <template #cell-overlaySize="{ row }">{{
        humanBytes(row.overlaySize)
      }}</template>
      <template #actions="{ row }">
        <Cluster
          gap="1"
          role="group"
          :aria-label="`Actions for r${row.revision}`"
        >
          <Button
            variant="tertiary"
            size="sm"
            data-test="history-view"
            @click="view(row.revision)"
            >View</Button
          >
          <Button
            variant="tertiary"
            size="sm"
            data-test="history-diff-prev"
            @click="diff(row.revision - 1, row.revision)"
            >Diff with previous</Button
          >
          <Button
            v-if="row.revision !== desiredRevision"
            variant="tertiary"
            size="sm"
            data-test="history-diff-current"
            @click="diff(row.revision, desiredRevision)"
            >Diff with current</Button
          >
          <Button
            v-if="row.revision !== desiredRevision"
            variant="tertiary"
            size="sm"
            :disabled-reason="canRevert ? undefined : revertTooltip"
            data-test="history-revert"
            @click="openRevert(row.revision)"
            >Revert</Button
          >
        </Cluster>
      </template>
    </DataTable>
    <Text
      v-if="error && items.length"
      role="alert"
      data-test="history-page-error"
    >
      {{ error }}
    </Text>
    <Cluster v-if="items.length && page < totalPages">
      <Button
        size="sm"
        :loading="loading"
        data-test="history-more"
        @click="loadMore"
        >Load more</Button
      >
    </Cluster>

    <!-- View -->
    <Dialog
      v-model:open="viewOpen"
      :title="`Overlay r${viewRev}`"
      size="l"
      data-test="history-view-dialog"
    >
      <Text v-if="dialogLoading" variant="secondary">Loading…</Text>
      <InlineMessage
        v-else-if="dialogError"
        tone="error"
        data-test="view-error"
      >
        {{ dialogError }}
      </InlineMessage>
      <ConfigYamlViewer
        v-else-if="viewOpen"
        :doc="viewDoc"
        :filename="`${fileBase}-overlay-r${viewRev}.yaml`"
        empty-text="No overlay."
        :label="`Overlay r${viewRev}`"
      />
    </Dialog>

    <!-- Diff -->
    <Dialog
      v-model:open="diffOpen"
      :title="diffTitle"
      size="l"
      data-test="history-diff-dialog"
    >
      <Text v-if="dialogLoading" variant="secondary">Loading…</Text>
      <InlineMessage
        v-else-if="dialogError"
        tone="error"
        data-test="diff-error"
      >
        {{ dialogError }}
      </InlineMessage>
      <CodeMergeView
        v-else-if="diffOpen"
        :original="diffOriginal"
        :modified="diffModified"
        language="yaml"
        mode="split"
        :label="`Differences ${diffTitle}`"
      />
    </Dialog>

    <!-- Revert: asks for an optional comment. -->
    <Dialog v-model:open="revertOpen" title="Revert configuration" size="s">
      <Stack gap="3" data-test="revert-dialog">
        <Text>
          Create revision r{{ desiredRevision + 1 }} with the overlay of r{{
            revertRev
          }}? It is re-validated against the current instances.
        </Text>
        <FormField label="Comment (optional)">
          <Textarea
            v-model="revertComment"
            :maxlength="LIMITS.commentChars"
            :rows="2"
            data-test="revert-comment"
          />
        </FormField>
      </Stack>
      <template #footer>
        <Button variant="tertiary" @click="revertOpen = false">Cancel</Button>
        <Button
          variant="primary"
          :loading="reverting"
          data-test="revert-confirm"
          @click="doRevert"
          >Revert to r{{ revertRev }}</Button
        >
      </template>
    </Dialog>

    <!-- 422 on revert: the old overlay may be invalid for today's bases -->
    <Dialog v-model:open="invalidOpen" title="Revert rejected" size="m">
      <Stack gap="2" data-test="revert-invalid">
        <Text>{{ invalidBody?.body }}</Text>
        <Stack as="ul" gap="1">
          <li v-for="(e, i) in invalidBody?.overlay ?? []" :key="`o${i}`">
            <Text as="code" variant="code">{{ e.path || '/' }}</Text> —
            {{ e.message }}
          </li>
          <template
            v-for="inst in invalidBody?.instances ?? []"
            :key="inst['instance-id']"
          >
            <li
              v-for="(e, i) in inst.errors"
              :key="`${inst['instance-id']}${i}`"
            >
              {{ inst.hostname || inst['instance-id'] }}:
              <Text as="code" variant="code">{{ e.path || '/' }}</Text> —
              {{ e.message }}
            </li>
          </template>
        </Stack>
      </Stack>
    </Dialog>
  </Stack>
</template>
