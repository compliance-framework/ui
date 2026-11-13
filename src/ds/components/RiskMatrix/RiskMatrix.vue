<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { useScrollable } from '../ScrollArea/useScrollable';

/**
 * A likelihood × impact matrix with named, keyboard-accessible links to the risks in each cell.
 * `levels` lists the scale lowest first with its labels; stronger shading means more risks.
 */
const props = defineProps<{
  levels: { value: string; label: string }[];
  cells: { likelihood: string; impact: string; count: number }[];
  to: (likelihood: string, impact: string) => RouteLocationRaw;
}>();
const { scrollable } = useScrollable('region', 'horizontal');

function count(likelihood: string, impact: string): number {
  return (
    props.cells.find(
      (cell) => cell.likelihood === likelihood && cell.impact === impact,
    )?.count ?? 0
  );
}
const maximum = computed(() =>
  Math.max(1, ...props.cells.map((cell) => cell.count)),
);
function colour(likelihood: string, impact: string) {
  return {
    '--matrix-frequency': `${(count(likelihood, impact) / maximum.value) * 100}%`,
  };
}
</script>

<template>
  <div
    ref="region"
    class="risk-matrix"
    role="region"
    aria-label="Risk severity by likelihood and impact"
    :tabindex="scrollable ? 0 : undefined"
  >
    <table>
      <caption>
        Likelihood × impact · open risks. Stronger shading means more risks.
      </caption>
      <thead>
        <tr>
          <th scope="col">Likelihood ↓ / Impact →</th>
          <th v-for="impact in levels" :key="impact.value" scope="col">
            {{ impact.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="likelihood in [...levels].reverse()" :key="likelihood.value">
          <th scope="row">{{ likelihood.label }}</th>
          <td v-for="impact in levels" :key="impact.value">
            <RouterLink
              :to="to(likelihood.value, impact.value)"
              :style="colour(likelihood.value, impact.value)"
              :aria-label="`${likelihood.label} likelihood, ${impact.label} impact: ${count(likelihood.value, impact.value)} risks`"
              >{{ count(likelihood.value, impact.value) }}</RouterLink
            >
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.risk-matrix {
  max-width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--ds-font-size-caption);
}

caption {
  text-align: start;
  color: var(--ds-color-text-secondary);
  padding-block-end: var(--ds-space-3);
}

th {
  padding: var(--ds-space-2);
  font-weight: var(--ds-font-weight-regular);
  text-align: start;
}

td {
  padding: var(--ds-space-1);
}

a {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: var(--ds-size-target-min);
  min-height: var(--ds-size-control-md);
  background: color-mix(
    in srgb,
    var(--ds-color-surface-selected) var(--matrix-frequency),
    var(--ds-color-surface-base)
  );
  color: var(--ds-color-text-primary);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
