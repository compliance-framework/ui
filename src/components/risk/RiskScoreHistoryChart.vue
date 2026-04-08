<template>
  <div
    class="rounded-lg border border-ccf-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
  >
    <div class="flex items-center justify-between gap-3 mb-4">
      <div>
        <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
          Score History
        </h4>
        <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Likelihood × impact score over time (1–25)
        </p>
      </div>
    </div>

    <div v-if="isLoading" class="text-sm text-gray-500 dark:text-slate-400">
      Loading score history…
    </div>

    <div
      v-else-if="!scores.length"
      class="text-sm text-gray-500 dark:text-slate-400"
    >
      No score history recorded for this risk yet.
    </div>

    <template v-else>
      <!-- Chart -->
      <div class="h-44">
        <LineChart :data="chartData" :options="chartOptions" />
      </div>

      <!-- Legend: baseline vs residual -->
      <div
        class="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400"
      >
        <span class="flex items-center gap-1">
          <span class="inline-block h-2 w-2 rounded-full bg-blue-600"></span>
          Baseline
        </span>
        <span class="flex items-center gap-1">
          <span class="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
          Residual
        </span>
      </div>

      <!-- Summary row -->
      <div
        class="mt-4 grid grid-cols-3 gap-2 border-t border-ccf-300 pt-3 dark:border-slate-700"
      >
        <div class="text-center">
          <p class="text-xs text-gray-500 dark:text-slate-400">Baseline</p>
          <p class="text-lg font-bold text-blue-600">
            {{ baselineScore ?? '—' }}
          </p>
        </div>
        <div class="text-center">
          <p class="text-xs text-gray-500 dark:text-slate-400">Current</p>
          <p class="text-lg font-bold" :class="currentScoreClass">
            {{ currentScore ?? '—' }}
          </p>
        </div>
        <div class="text-center">
          <p class="text-xs text-gray-500 dark:text-slate-400">Reduction</p>
          <p class="text-lg font-bold" :class="reductionClass">
            {{ reductionLabel }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ChartData, ChartOptions } from 'chart.js';
import LineChart from '@/components/charts/LineChart.vue';
import type { RiskScore } from '@/types/risk-scores';

const props = defineProps<{
  scores: RiskScore[];
  isLoading?: boolean;
}>();

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

const baselineScore = computed<number | null>(() => {
  const entry = props.scores.find((s) => s.scoreType === 'baseline');
  return entry ? entry.score : null;
});

const currentScore = computed<number | null>(() => {
  if (!props.scores.length) return null;
  return props.scores[props.scores.length - 1].score;
});

const reduction = computed<number | null>(() => {
  if (baselineScore.value === null || currentScore.value === null) return null;
  return baselineScore.value - currentScore.value;
});

const reductionLabel = computed<string>(() => {
  if (reduction.value === null) return '—';
  if (reduction.value > 0) return `−${reduction.value}`;
  if (reduction.value < 0) return `+${Math.abs(reduction.value)}`;
  return '0';
});

// ---------------------------------------------------------------------------
// CSS class helpers
// ---------------------------------------------------------------------------

function scoreClass(score: number | null): string {
  if (score === null) return 'text-gray-500 dark:text-slate-400';
  if (score >= 20) return 'text-red-600 dark:text-red-400';
  if (score >= 12) return 'text-orange-500 dark:text-orange-400';
  if (score >= 6) return 'text-yellow-500 dark:text-yellow-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

const currentScoreClass = computed(() => scoreClass(currentScore.value));

const reductionClass = computed<string>(() => {
  if (reduction.value === null) return 'text-gray-500 dark:text-slate-400';
  if (reduction.value > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (reduction.value < 0) return 'text-red-600 dark:text-red-400';
  return 'text-gray-500 dark:text-slate-400';
});

// ---------------------------------------------------------------------------
// Chart data
// ---------------------------------------------------------------------------

const chartData = computed<ChartData<'line'>>(() => {
  const labels = props.scores.map((s) => {
    const d = new Date(s.occurredAt);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  });

  const baselineData = props.scores.map((s) =>
    s.scoreType === 'baseline' ? s.score : null,
  );
  const residualData = props.scores.map((s) =>
    s.scoreType === 'residual' ? s.score : null,
  );

  return {
    labels,
    datasets: [
      {
        label: 'Baseline',
        data: baselineData,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.16)',
        pointRadius: 5,
        pointHoverRadius: 6,
        tension: 0,
        spanGaps: false,
      },
      {
        label: 'Residual',
        data: residualData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        pointRadius: 5,
        pointHoverRadius: 6,
        tension: 0.2,
        spanGaps: false,
        fill: true,
      },
    ],
  };
});

const chartOptions: ChartOptions<'line'> = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label(ctx) {
          const score = ctx.parsed.y;
          const type = ctx.dataset.label ?? '';
          return `${type}: ${score}`;
        },
      },
    },
  },
  scales: {
    x: {
      ticks: {
        maxTicksLimit: 8,
      },
      grid: {
        display: false,
      },
    },
    y: {
      min: 0,
      max: 25,
      ticks: {
        stepSize: 5,
        precision: 0,
      },
      title: {
        display: true,
        text: 'Score',
        font: { size: 11 },
      },
    },
  },
};
</script>
