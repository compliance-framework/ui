<template>
  <div class="p-6">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-200 mb-6">
      Back Matter
    </h2>

    <div class="text-center py-12 text-gray-500 dark:text-slate-400">
      <p>Back Matter management is coming soon.</p>
      <p class="mt-2 text-sm">
        This section will allow you to manage resources and references.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type PropType } from 'vue';
import type { AssessmentResults } from '@/oscal';

defineProps({
  assessmentResults: {
    type: Object as PropType<AssessmentResults>,
    required: true,
  },
});
</script>
