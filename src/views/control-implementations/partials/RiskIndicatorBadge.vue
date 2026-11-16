<script setup lang="ts">
/** How many risks are linked: a button that opens them when `clickable`, otherwise a tag. */
import Button from '@/ds/components/Button/Button.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import { computed } from 'vue';

const props = defineProps<{
  riskCount: number;
  isCapped?: boolean;
  highestSeverity?: 'high' | 'medium' | 'low';
  clickable?: boolean;
}>();
// Forward the native event so callers can use the `.stop` modifier without
// `.stopPropagation()` being called on `undefined`.
const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const displayCount = computed(() =>
  props.isCapped && props.riskCount >= 100 ? '99+' : `${props.riskCount}`,
);

const tooltipText = computed(() => {
  if (displayCount.value === '1') return '1 risk associated';
  return `${displayCount.value} risks associated`;
});

function onClick(event: MouseEvent) {
  if (!props.clickable) {
    return;
  }
  emit('click', event);
}
</script>

<template>
  <template v-if="riskCount > 0">
    <Button
      v-if="clickable"
      icon="alert"
      :aria-label="tooltipText"
      @click="onClick"
      >{{ displayCount }}</Button
    >
    <Tag v-else :label="tooltipText" />
  </template>
</template>
