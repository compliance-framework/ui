<template>
  <label :class="labelClass">
    <slot></slot>
    <span
      v-if="props.required"
      class="ml-1"
      :class="isV2Route ? 'text-[var(--ui-v2-error)]' : 'text-red-500'"
      aria-hidden="true"
    >
      *
    </span>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useIsV2Route } from './useRouteUiVersion';

const props = defineProps<{
  required?: boolean;
}>();

const isV2Route = useIsV2Route();

const labelClass = computed(() => {
  if (isV2Route.value) {
    return 'pb-2 font-[var(--ui-v2-font-secondary)] text-[11px] font-bold uppercase tracking-[1px] text-[var(--ui-v2-secondary-foreground)]';
  }

  return 'pb-2 dark:text-slate-300';
});
</script>
