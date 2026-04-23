<template>
  <div class="flex min-w-0 max-w-full items-center flex-wrap">
    <div
      v-for="label of sortedLabels"
      :key="label.name"
      class="m-1 max-w-full min-w-0 break-words rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-sm text-gray-800 [overflow-wrap:anywhere] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      :title="label.label"
    >
      {{ label.label }}
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { EvidenceLabel } from '@/stores/evidence.ts';

const { labels, showAll, excludeKeys } = defineProps({
  labels: {
    type: Array,
    required: true,
  },
  showAll: {
    type: Boolean,
    default() {
      return false;
    },
  },
  excludeKeys: {
    type: Array,
    default() {
      return [];
    },
  },
});

function shouldHide(label: EvidenceLabel): boolean {
  return label.name.substring(0, 1) != '_' && !excludeKeys.includes(label.name);
}

interface ListLabel {
  name: string;
  value: string;
  label: string;
  shouldHide: boolean;
}

const sortedLabels = computed(() => {
  const localLabels = labels as EvidenceLabel[];
  return localLabels
    .map((label: EvidenceLabel) => {
      return {
        name: label.name,
        value: label.value,
        label: `${label.name}=${label.value}`,
        shouldHide: shouldHide(label),
      } as ListLabel;
    })
    .sort((a: ListLabel, b: ListLabel): number => {
      // put hidden items last
      if (a.shouldHide < b.shouldHide) {
        return 1;
      }

      // then sort alphabetically
      return a.name > b.name ? -1 : 0;
    })
    .filter((a: ListLabel) => {
      if (showAll) {
        // showAll activates all labels
        return true;
      }
      // if not, follow our normal rules
      return a.shouldHide;
    });
});
</script>
