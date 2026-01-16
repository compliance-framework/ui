<script setup lang="ts">
import InfoCircleIcon from '@primevue/icons/infocircle';

const props = withDefaults(
  defineProps<{
    text: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    icon?: any;
    iconClass?: string;
  }>(),
  {
    position: 'top',
    icon: InfoCircleIcon,
    iconClass: 'inline-block ml-1 cursor-help',
  },
);
</script>

<template>
  <component
    v-if="position === 'top'"
    :is="icon"
    :class="iconClass"
    v-tooltip.top="text"
  />
  <component
    v-else-if="position === 'bottom'"
    :is="icon"
    :class="iconClass"
    v-tooltip.bottom="text"
  />
  <component
    v-else-if="position === 'left'"
    :is="icon"
    :class="iconClass"
    v-tooltip.left="text"
  />
  <component
    v-else-if="position === 'right'"
    :is="icon"
    :class="iconClass"
    v-tooltip.right="text"
  />
</template>
