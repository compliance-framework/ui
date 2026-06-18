<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  count: number;
}>();
// Forward the native event so callers can apply the `.stop` modifier (the Tree
// row should not react when the badge is clicked).
const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const displayCount = computed(() =>
  props.count >= 100 ? '99+' : `${props.count}`,
);

const tooltipText = computed(() =>
  props.count === 1
    ? '1 pending AI dashboard suggestion'
    : `${props.count} pending AI dashboard suggestions`,
);

function onClick(event: MouseEvent) {
  emit('click', event);
}
</script>

<template>
  <button
    v-if="count > 0"
    type="button"
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-90 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
    :title="tooltipText"
    :aria-label="tooltipText"
    @click="onClick"
  >
    ✨ {{ displayCount }}
  </button>
</template>
