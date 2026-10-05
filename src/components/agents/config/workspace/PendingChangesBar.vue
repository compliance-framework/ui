<template>
  <div
    v-if="visible"
    class="sticky bottom-0 z-20 -mx-1 rounded-md border border-sky-300 bg-sky-50/95 px-4 py-3 shadow-md backdrop-blur dark:border-sky-700 dark:bg-slate-900/95"
    role="region"
    aria-label="Pending configuration changes"
    data-test="pending-bar"
  >
    <div class="flex flex-wrap items-center gap-3 text-sm">
      <span
        class="font-medium text-gray-900 dark:text-slate-100"
        data-test="pending-count"
      >
        {{ count }} pending change{{ count === 1 ? '' : 's' }}
      </span>
      <button
        type="button"
        class="text-xs text-sky-700 hover:underline dark:text-sky-300"
        :aria-expanded="expanded"
        data-test="pending-toggle"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Hide' : 'Show' }}
      </button>
      <span
        v-if="ws.blockingCount.value"
        class="text-xs text-red-600 dark:text-red-400"
        data-test="pending-blocking"
      >
        <i class="pi pi-times-circle mr-1 text-[0.7rem]" />{{
          ws.blockingCount.value
        }}
        problem{{ ws.blockingCount.value === 1 ? '' : 's' }} to fix
      </span>
      <span
        v-if="behind"
        class="text-xs text-amber-700 dark:text-amber-300"
        data-test="pending-behind"
      >
        Based on r{{ draft.baseRevision.value }}; r{{ latestRevision }} is the
        desired revision now
      </span>
      <span
        class="text-xs text-gray-500 dark:text-slate-400"
        aria-live="polite"
        data-test="live-check"
      >
        <template v-if="ws.preview.status.value === 'checking'">
          <i class="pi pi-spin pi-spinner mr-1 text-[0.7rem]" />Checking…
        </template>
        <template v-else-if="ws.preview.status.value === 'checked'">
          <i class="pi pi-check mr-1 text-[0.7rem]" />Checked
        </template>
        <span
          v-else-if="ws.preview.status.value === 'failed'"
          class="text-red-600 dark:text-red-400"
          data-test="live-check-failed"
        >
          <i class="pi pi-exclamation-circle mr-1 text-[0.7rem]" />Check
          failed<template v-if="ws.preview.error.value"
            >: {{ ws.preview.error.value }}</template
          >
          <button
            type="button"
            class="ml-1 text-sky-700 hover:underline dark:text-sky-300"
            data-test="live-check-retry"
            @click="ws.preview.retry()"
          >
            Retry
          </button>
        </span>
      </span>
      <span class="flex-1" />
      <TertiaryButton
        size="small"
        data-test="pending-discard"
        @click="confirmDiscard"
      >
        Discard
      </TertiaryButton>
      <span v-tooltip.top="{ value: reviewTooltip, disabled: !reviewTooltip }">
        <PrimaryButton
          size="small"
          :disabled="!!reviewTooltip"
          data-test="pending-review"
          @click="ws.openReview()"
        >
          Review &amp; save
        </PrimaryButton>
      </span>
    </div>
    <div v-if="expanded" class="mt-2 space-y-1" data-test="pending-list">
      <ul class="flex flex-wrap gap-1">
        <li
          v-for="p in draft.changedPaths.value"
          :key="p"
          class="inline-flex items-center gap-1 rounded bg-white px-1.5 font-mono text-xs dark:bg-slate-800"
        >
          {{ p }}
          <button
            type="button"
            class="text-sky-700 dark:text-sky-300"
            :aria-label="`Undo ${p}`"
            :data-test="`pending-undo-${p}`"
            @click="draft.revertPointer(p)"
          >
            ↺
          </button>
        </li>
      </ul>
      <ul
        v-if="draft.issues.value.length"
        class="space-y-0.5 text-xs"
        data-test="pending-issues"
      >
        <li
          v-for="(i, idx) in draft.issues.value"
          :key="idx"
          :class="
            i.blocking
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-700 dark:text-amber-300'
          "
        >
          <code class="font-mono">{{ i.ptr || '/' }}</code> — {{ i.message }}
        </li>
      </ul>
    </div>
  </div>
  <ReviewSaveDialog
    v-if="ws.reviewOpen.value"
    v-model:visible="ws.reviewOpen.value"
  />
</template>

<script setup lang="ts">
// The sticky "N pending changes · Review & save · Discard" bar (R69). It follows the shared
// per-agent draft.
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
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
