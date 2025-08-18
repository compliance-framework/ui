<template>
  <div class="flex items-center flex-wrap">
    <div
      v-for="label of sortedLabels"
      :key="label.name"
      class="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 m-1 text-gray-800 dark:text-slate-300 rounded-md text-sm px-2 py-1"
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
