<script setup lang="ts">
import { computed } from 'vue';
import Badge from '@/volt/Badge.vue';
import { getV2StatusMeta, type V2StatusTone } from '@/utils/v2Status';

const props = withDefaults(
  defineProps<{
    status?: string | null;
    label?: string;
  }>(),
  {
    status: undefined,
    label: undefined,
  },
);

const meta = computed(() => getV2StatusMeta(props.status));

const resolvedLabel = computed(() => props.label || meta.value.label);

const severity = computed(() => {
  const toneToSeverity: Record<V2StatusTone, string> = {
    neutral: 'secondary',
    success: 'success',
    warning: 'warn',
    danger: 'danger',
    info: 'info',
  };
  return toneToSeverity[meta.value.tone];
});
</script>

<template>
  <Badge :severity="severity" :value="resolvedLabel" />
</template>
