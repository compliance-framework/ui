<script setup lang="ts">
import { computed } from 'vue';
import { getTooltipText } from '@/config/tooltips';

const props = withDefaults(
  defineProps<{
    text: string;
    tooltipKey?: string;
    tooltipText?: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    underlineClass?: string;
  }>(),
  {
    position: 'bottom',
    underlineClass: 'underline decoration-dotted cursor-help',
  },
);

// Get tooltip text from key or use direct text
const resolvedTooltipText = computed(() => {
  if (props.tooltipKey) {
    return getTooltipText(props.tooltipKey);
  }
  return props.tooltipText;
});

// Determine if we should show tooltip styling
const hasTooltip = computed(() => !!resolvedTooltipText.value);

// Get the class to apply - with or without underline
const appliedClass = computed(() => {
  if (!hasTooltip.value) {
    // Remove underline-related classes if no tooltip
    return props.underlineClass
      .replace(/underline|decoration-\S+|cursor-help/g, '')
      .trim();
  }
  return props.underlineClass;
});
</script>

<template>
  <!-- With tooltip -->
  <span
    v-if="hasTooltip && position === 'top'"
    :class="appliedClass"
    v-tooltip.top="resolvedTooltipText"
  >
    {{ text }}
  </span>
  <span
    v-else-if="hasTooltip && position === 'bottom'"
    :class="appliedClass"
    v-tooltip.bottom="resolvedTooltipText"
  >
    {{ text }}
  </span>
  <span
    v-else-if="hasTooltip && position === 'left'"
    :class="appliedClass"
    v-tooltip.left="resolvedTooltipText"
  >
    {{ text }}
  </span>
  <span
    v-else-if="hasTooltip && position === 'right'"
    :class="appliedClass"
    v-tooltip.right="resolvedTooltipText"
  >
    {{ text }}
  </span>

  <!-- Without tooltip - plain text -->
  <span v-else :class="appliedClass">
    {{ text }}
  </span>
</template>
