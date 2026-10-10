<script setup lang="ts">
import { computed } from 'vue';
import { heatStyle, ACCEPTED_STYLE } from './heatScale';
import type { LineageRisk } from '@/composables/useLineage/types';

const props = defineProps<{ risk: LineageRisk }>();

const muted = computed(() => props.risk.mutedScoreSum > 0);
// Open risk drives the heat; when there's none but accepted/mitigated risk
// remains, show the blue "accepted" tint rather than a neutral zero.
const style = computed(() =>
  props.risk.openScoreSum <= 0 && muted.value
    ? ACCEPTED_STYLE
    : heatStyle(props.risk.openScoreSum),
);
</script>

<template>
  <span class="inline-flex items-center gap-1">
    <span
      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
      :class="style.badgeClass"
      v-tooltip.top="`${style.label} — sum of open risk scores`"
    >
      <span class="h-2 w-2 rounded-full" :class="style.swatchClass"></span>
      risk {{ risk.openScoreSum }}
    </span>
    <span
      v-if="muted"
      class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 whitespace-nowrap dark:bg-slate-800 dark:text-slate-400"
      v-tooltip.top="'Accepted / mitigated risk score (muted)'"
    >
      +{{ risk.mutedScoreSum }} accepted/mitigated
    </span>
  </span>
</template>
