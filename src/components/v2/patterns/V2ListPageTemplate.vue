<script setup lang="ts">
import V2ContentSkeleton from '@/components/v2/patterns/V2ContentSkeleton.vue';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';

interface Props {
  loading: boolean;
  hasItems: boolean;
  errorMessage?: string | null;
  loadingDescription?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

withDefaults(defineProps<Props>(), {
  errorMessage: null,
  loadingDescription: 'Loading list data...',
  emptyTitle: 'No data',
  emptyDescription: 'No items are available yet.',
});
</script>

<template>
  <div class="space-y-6">
    <slot name="header" />

    <slot name="filters" />

    <V2ContentSkeleton v-if="loading" variant="table" :rows="5" />

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

    <template v-else-if="!hasItems">
      <slot name="empty">
        <V2StatePanel
          kind="empty"
          :title="emptyTitle"
          :description="emptyDescription"
        >
          <template #actions>
            <slot name="empty-actions" />
          </template>
        </V2StatePanel>
      </slot>
    </template>

    <slot v-else />
  </div>
</template>
