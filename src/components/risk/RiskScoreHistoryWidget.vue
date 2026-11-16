<template>
  <Panel
    title="Score history"
    description="Baseline and residual scores over time."
    :level="3"
  >
    <template v-if="latestSnapshot" #actions>
      <Cluster gap="1">
        <Tag :label="`Baseline ${latestSnapshot.baselineScore}`" />
        <Tag :label="`Residual ${latestSnapshot.residualScore}`" />
      </Cluster>
    </template>
    <DataState
      :status="status"
      subject="the score history"
      empty-title="No score history yet"
      empty-body="Scores are recorded when the risk is created and reassessed."
      skeleton="panel"
    >
      <LineChart
        label="Baseline and residual risk score over time"
        :series="series"
        y-label="Score"
        x-label="Date"
        :y-max="yMax"
        :format-y="(value: number) => String(Math.round(value))"
      />
      <DescriptionList :items="latestFacts" />
    </DataState>
  </Panel>
</template>

<script setup lang="ts">
/**
 * A risk's score history: baseline and residual scores over time as a line chart, with the latest
 * snapshot's likelihood, impact, date and the event that recorded it. The data and sorting are
 * the classic widget's.
 */
import { computed } from 'vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import LineChart from '@/ds/components/LineChart/LineChart.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import type { RiskScoreSnapshot } from '@/utils/risk-dashboard';

const props = defineProps<{
  snapshots: RiskScoreSnapshot[];
  loading?: boolean;
  error?: boolean;
}>();

const sortedSnapshots = computed(() =>
  [...props.snapshots].sort((left, right) => {
    const leftTime = Date.parse(left.occurredAt);
    const rightTime = Date.parse(right.occurredAt);

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
    if (Number.isNaN(leftTime)) return 1;
    if (Number.isNaN(rightTime)) return -1;
    return leftTime - rightTime;
  }),
);

const latestSnapshot = computed(
  () => sortedSnapshots.value[sortedSnapshots.value.length - 1] || null,
);

const series = computed(() => [
  {
    name: 'Baseline score',
    points: sortedSnapshots.value.map((snapshot) => ({
      x: snapshot.occurredAt.slice(0, 10),
      y: snapshot.baselineScore,
    })),
  },
  {
    name: 'Residual score',
    points: sortedSnapshots.value.map((snapshot) => ({
      x: snapshot.occurredAt.slice(0, 10),
      y: snapshot.residualScore,
    })),
  },
]);
// Scores are small whole numbers; the axis tops out just above the highest one.
const yMax = computed(() =>
  Math.max(
    5,
    ...sortedSnapshots.value.flatMap((s) => [s.baselineScore, s.residualScore]),
  ),
);
const status = computed(() =>
  props.loading
    ? 'loading'
    : props.error
      ? 'error'
      : props.snapshots.length
        ? 'ready'
        : 'empty',
);
const latestFacts = computed(() => {
  const latest = latestSnapshot.value;
  if (!latest) return [];
  return [
    {
      key: 'likelihood',
      label: 'Likelihood',
      value: formatTokenLabel(latest.likelihood),
    },
    { key: 'impact', label: 'Impact', value: formatTokenLabel(latest.impact) },
    {
      key: 'date',
      label: 'Last snapshot',
      value: formatDate(latest.occurredAt),
    },
    {
      key: 'event',
      label: 'Event',
      value: formatTokenLabel(latest.sourceEventType),
    },
  ];
});

function formatTokenLabel(value?: string): string {
  const normalized = (value || '').trim();
  if (!normalized) return 'N/A';
  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatDate(value?: string): string {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}
</script>
