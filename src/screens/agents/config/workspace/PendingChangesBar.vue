<script setup lang="ts">
// The sticky "N pending changes · Discard · Review and save" bar (R69). It follows the shared
// per-agent draft.
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import Button from '@/ds/components/Button/Button.vue';
import Icon from '@/ds/components/Icon/Icon.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { useWorkspace } from '@/composables/agent-config/useConfigWorkspace';

// The review (diff views, CodeMirror merge) loads only when someone reviews.
const ReviewSaveDialog = defineAsyncComponent(
  () => import('./ReviewSaveDialog.vue'),
);

const ws = useWorkspace()!;
const draft = ws.draft;
const confirm = useConfirm();
const expanded = ref(false);

const visible = computed(
  () => ws.canConfigure.value && ws.ready.value && draft.isDirty.value,
);
const count = computed(() => draft.changedPaths.value.length);
const latestRevision = computed(() => ws.state.config.value?.revision ?? 0);
const behind = computed(
  () =>
    !!ws.state.config.value &&
    latestRevision.value !== draft.baseRevision.value,
);
const reviewTooltip = computed(() => ws.reviewDisabledReason.value);

function confirmDiscard() {
  confirm.require({
    header: 'Discard pending changes?',
    message: `Discard ${count.value} pending change${count.value === 1 ? '' : 's'}? Nothing has been saved yet.`,
    rejectProps: { label: 'Keep', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Discard', severity: 'danger' },
    accept: () => ws.discard(),
  });
}

function beforeUnload(e: BeforeUnloadEvent) {
  e.preventDefault();
  e.returnValue = '';
}
watch(
  visible,
  (dirty) => {
    if (dirty) window.addEventListener('beforeunload', beforeUnload);
    else window.removeEventListener('beforeunload', beforeUnload);
  },
  { immediate: true },
);
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
</script>

<template>
  <Panel
    v-if="visible"
    sticky="bottom"
    dense
    aria-label="Pending configuration changes"
    data-test="pending-bar"
  >
    <Cluster gap="3" justify="between">
      <Cluster gap="3">
        <Text as="strong" data-test="pending-count"
          >{{ count }} pending change{{ count === 1 ? '' : 's' }}</Text
        >
        <Button
          variant="tertiary"
          size="sm"
          :aria-expanded="expanded"
          data-test="pending-toggle"
          @click="expanded = !expanded"
          >{{ expanded ? 'Hide' : 'Show' }}</Button
        >
        <Text
          v-if="ws.blockingCount.value"
          as="span"
          variant="caption"
          data-test="pending-blocking"
          >{{ ws.blockingCount.value }} problem{{
            ws.blockingCount.value === 1 ? '' : 's'
          }}
          to fix</Text
        >
        <Text
          v-if="behind"
          as="span"
          variant="caption"
          data-test="pending-behind"
          >Based on r{{ draft.baseRevision.value }}; r{{ latestRevision }} is
          the desired revision now</Text
        >
        <Cluster gap="1" as="span" aria-live="polite" data-test="live-check">
          <template v-if="ws.preview.status.value === 'checking'">
            <Icon name="loading" size="sm" />
            <Text as="span" variant="caption">Checking…</Text>
          </template>
          <template v-else-if="ws.preview.status.value === 'checked'">
            <Icon name="check" size="sm" />
            <Text as="span" variant="caption">Checked</Text>
          </template>
          <Cluster
            v-else-if="ws.preview.status.value === 'failed'"
            gap="1"
            as="span"
            data-test="live-check-failed"
          >
            <Text as="span" variant="caption"
              >Check failed<template v-if="ws.preview.error.value"
                >: {{ ws.preview.error.value }}</template
              ></Text
            >
            <Button
              variant="tertiary"
              size="sm"
              data-test="live-check-retry"
              @click="ws.preview.retry()"
              >Retry</Button
            >
          </Cluster>
        </Cluster>
      </Cluster>
      <Cluster gap="2">
        <Button
          variant="tertiary"
          size="sm"
          data-test="pending-discard"
          @click="confirmDiscard"
          >Discard</Button
        >
        <Button
          variant="primary"
          size="sm"
          :disabled-reason="reviewTooltip || undefined"
          data-test="pending-review"
          @click="ws.openReview()"
          >Review and save</Button
        >
      </Cluster>
    </Cluster>
    <Stack v-if="expanded" gap="2" data-test="pending-list">
      <Cluster gap="2">
        <Cluster
          v-for="p in draft.changedPaths.value"
          :key="p"
          gap="1"
          as="span"
        >
          <Tag :label="p" />
          <IconButton
            icon="undo"
            size="sm"
            :label="`Undo ${p}`"
            :data-test="`pending-undo-${p}`"
            @click="draft.revertPointer(p)"
          />
        </Cluster>
      </Cluster>
      <Stack
        v-if="draft.issues.value.length"
        gap="1"
        data-test="pending-issues"
      >
        <Text
          v-for="(i, idx) in draft.issues.value"
          :key="idx"
          variant="caption"
          >{{ i.blocking ? 'Error' : 'Warning' }}: {{ i.ptr || '/' }} —
          {{ i.message }}</Text
        >
      </Stack>
    </Stack>
  </Panel>
  <ReviewSaveDialog
    v-if="ws.reviewOpen.value"
    v-model:visible="ws.reviewOpen.value"
  />
</template>
