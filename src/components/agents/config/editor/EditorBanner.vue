<template>
  <div class="space-y-2" data-test="editor-banner">
    <Message v-if="policyOnly" severity="info" data-test="policy-only-banner">
      You can edit policy bundles and wire <code>inline:</code> bundles into
      plugins. Other settings are read-only.
    </Message>
    <p
      class="text-xs text-gray-500 dark:text-slate-400"
      data-test="secrets-notice"
    >
      <i class="pi pi-info-circle mr-1" />{{ OVERLAY_SECRETS_NOTICE }}
    </p>
    <div class="flex flex-wrap items-center gap-3 text-xs" aria-live="polite">
      <span v-if="detailsLoading" class="text-gray-500"
        >Loading instance files…</span
      >
      <span
        v-if="blockingCount"
        class="text-red-600 dark:text-red-400"
        data-test="blocking-count"
      >
        {{ blockingCount }} problem{{ blockingCount === 1 ? '' : 's' }} to fix
        before review
      </span>
      <span
        v-if="previewStatus === 'checking'"
        class="text-gray-500"
        data-test="live-check"
      >
        <i class="pi pi-spin pi-spinner mr-1 text-[0.7rem]" />Checking…
      </span>
      <span
        v-else-if="previewStatus === 'checked'"
        class="text-green-700 dark:text-green-300"
        data-test="live-check"
      >
        <i class="pi pi-check mr-1 text-[0.7rem]" />Checked
      </span>
      <span
        v-else-if="previewStatus === 'failed'"
        class="text-amber-700 dark:text-amber-300"
        data-test="live-check"
      >
        Check failed
        <button type="button" class="ml-1 underline" @click="$emit('retry')">
          (retry)
        </button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import Message from '@/volt/Message.vue';
import type { PreviewStatus } from '@/composables/agent-config/usePreview';
import { OVERLAY_SECRETS_NOTICE } from '../constants';

defineProps<{
  policyOnly: boolean;
  previewStatus: PreviewStatus;
  blockingCount: number;
  detailsLoading?: boolean;
}>();
defineEmits<{ retry: [] }>();
</script>
