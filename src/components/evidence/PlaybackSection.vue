<template>
  <PageCard :data-test="dataTest">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-4 text-left"
      :aria-expanded="open"
      :aria-controls="contentId"
      :data-test="dataTest ? `${dataTest}-toggle` : undefined"
      @click="emit('update:open', !open)"
    >
      <span class="flex items-center gap-2">
        <svg
          class="h-4 w-4 shrink-0 text-gray-500 transition-transform dark:text-slate-400"
          :class="open ? 'rotate-90' : ''"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.17 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
            clip-rule="evenodd"
          />
        </svg>
        <h3 class="text-lg font-semibold text-zinc-700 dark:text-slate-200">
          {{ title }}
        </h3>
      </span>
      <span
        v-if="$slots.summary"
        class="text-sm text-gray-600 dark:text-slate-400"
      >
        <slot name="summary" />
      </span>
    </button>
    <div v-if="open" :id="contentId" class="mt-4">
      <slot />
    </div>
  </PageCard>
</template>

<script setup lang="ts">
import { useId } from 'vue';
import PageCard from '@/components/PageCard.vue';

defineProps<{
  title: string;
  open: boolean;
  dataTest?: string;
}>();

const emit = defineEmits<{ 'update:open': [open: boolean] }>();

const contentId = useId();
</script>
