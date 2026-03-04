<script setup lang="ts">
import V2ContentSkeleton from '@/components/v2/patterns/V2ContentSkeleton.vue';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';

interface Props {
  loading: boolean;
  hasContent: boolean;
  errorMessage?: string | null;
  loadingDescription?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

withDefaults(defineProps<Props>(), {
  errorMessage: null,
  loadingDescription: 'Loading details...',
  emptyTitle: 'No content found',
  emptyDescription: 'The requested detail could not be loaded.',
});
</script>

<template>
  <div class="space-y-6">
    <slot v-if="hasContent && !loading" name="header" />

    <V2ContentSkeleton v-if="loading" variant="detail" :rows="4" />

    <V2StatePanel
      v-else-if="errorMessage"
      kind="error"
      title="Load failed"
      :description="errorMessage"
    >
      <template #actions>
        <slot name="error-actions" />
      </template>
    </V2StatePanel>

    <V2StatePanel
      v-else-if="!hasContent"
      kind="empty"
      :title="emptyTitle"
      :description="emptyDescription"
    >
      <template #actions>
        <slot name="empty-actions" />
      </template>
    </V2StatePanel>

    <template v-else>
      <slot name="tabs" />

      <section
        class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-5 lg:p-6"
      >
        <slot name="content" />
      </section>

      <div
        v-if="$slots.stickyActions"
        class="sticky bottom-0 z-20 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-3"
      >
        <div class="flex flex-wrap items-center justify-end gap-2">
          <slot name="stickyActions" />
        </div>
      </div>
    </template>
  </div>
</template>
