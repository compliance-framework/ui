<script setup lang="ts">
import { computed } from 'vue';
import type { ControlRiskSummary } from '@/composables/v2/useSspControlRisks';

// Open-risk count for a control, linking to the Risk Register filtered by that
// control (backlog M1-04). `plain` renders a non-link badge for places already
// inside a button, such as list rows.
const props = defineProps<{
  summary: ControlRiskSummary | null;
  controlId: string;
  plain?: boolean;
}>();

const label = computed(() => {
  if (!props.summary) return '';
  const { count, capped } = props.summary;
  return capped && count >= 100 ? '99+' : String(count);
});

const description = computed(() => {
  if (!props.summary) return '';
  const noun = label.value === '1' ? 'open risk' : 'open risks';
  const text = `${label.value} ${noun} on ${props.controlId}`;
  return props.plain ? text : `${text}. Open them in the Risk Register.`;
});

const toneClass = computed(() => {
  switch (props.summary?.severity) {
    case 'medium':
      return 'border-[var(--ui-v2-warning)] text-[var(--ui-v2-foreground)]';
    case 'low':
      return 'border-[var(--ui-v2-border)] text-[var(--ui-v2-secondary-foreground)]';
    default:
      return 'border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] text-[var(--ui-v2-error)]';
  }
});
</script>

<template>
  <template v-if="summary">
    <span
      v-if="plain"
      class="inline-flex items-center border px-1.5 py-[1px] text-[9px] font-bold tracking-[1px] uppercase"
      :class="toneClass"
      :title="description"
      data-testid="v2-risk-badge"
    >
      {{ label }} {{ label === '1' ? 'risk' : 'risks' }}
    </span>
    <RouterLink
      v-else
      :to="{ name: 'risks:index', query: { controlId } }"
      class="inline-flex items-center border px-1.5 py-[1px] text-[9px] font-bold tracking-[1px] uppercase hover:opacity-80"
      :class="toneClass"
      :title="description"
      :aria-label="description"
      data-testid="v2-risk-badge"
      @click.stop
    >
      {{ label }} {{ label === '1' ? 'risk' : 'risks' }}
    </RouterLink>
  </template>
</template>
