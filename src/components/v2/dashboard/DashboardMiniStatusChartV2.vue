<script setup lang="ts">
import { computed, watch } from 'vue';
import type { Filter } from '@/parsers/labelfilter';
import { useDataApi } from '@/composables/axios';
import type { ComplianceInterval } from '@/stores/evidence';
import { buildDashboardMiniChartModel } from './dashboardMiniChart';

const props = defineProps<{
  filter: Filter;
}>();

const intervalsQuery = '0m,2m,4m,6m,8m,12m,16m,20m,25m,30m,40m,50m,1h';

const {
  data: complianceIntervals,
  isLoading,
  error,
  execute: executeChart,
} = useDataApi<ComplianceInterval[]>(null, null, {
  immediate: false,
});

const chartModel = computed(() =>
  buildDashboardMiniChartModel(complianceIntervals.value),
);

const barClass = computed(() => {
  if (chartModel.value.dominantStatus === 'satisfied') {
    return 'bg-[var(--ui-v2-success)]';
  }

  if (chartModel.value.dominantStatus === 'not-satisfied') {
    return 'bg-[var(--ui-v2-error)]';
  }

  return 'bg-[#9ca0b066]';
});

const baselineClass = computed(() => {
  if (chartModel.value.baselineStatus === 'satisfied') {
    return 'bg-[#40a02b70]';
  }

  if (chartModel.value.baselineStatus === 'not-satisfied') {
    return 'bg-[#d20f3970]';
  }

  return '';
});

async function reloadChart(): Promise<void> {
  await executeChart('/api/evidence/status-over-time', {
    method: 'POST',
    params: {
      intervals: intervalsQuery,
    },
    data: {
      filter: props.filter,
    },
  });
}

watch(
  () => props.filter,
  () => {
    void reloadChart();
  },
  { deep: true, immediate: true },
);
</script>

<template>
  <div class="space-y-1.5">
    <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
      STATUS OVER TIME
    </p>

    <div
      v-if="isLoading"
      class="flex h-12 items-end gap-2 overflow-hidden border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-[10px] py-2"
    >
      <span
        v-for="index in 7"
        :key="index"
        class="h-4 w-[18px] shrink-0 animate-pulse bg-[#9ca0b066]"
      />
    </div>

    <div
      v-else-if="error"
      class="flex h-12 items-center justify-between gap-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3"
    >
      <span class="ui-v2-meta text-[var(--ui-v2-tertiary-foreground)]">
        Unable to load
      </span>
      <button
        type="button"
        class="ui-v2-label text-[var(--ui-v2-info)] transition-colors hover:text-[var(--ui-v2-primary)]"
        @click="reloadChart"
      >
        RETRY
      </button>
    </div>

    <div
      v-else-if="chartModel.state === 'empty'"
      class="flex h-12 items-end gap-2 overflow-hidden border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-[10px] py-2"
    >
      <span
        v-for="(height, index) in chartModel.bars"
        :key="index"
        class="w-[18px] shrink-0 bg-[#9ca0b066]"
        :style="{ height: `${height}px` }"
      />
    </div>

    <div
      v-else
      class="flex h-12 flex-col overflow-hidden border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]"
    >
      <div class="flex h-[46px] items-end gap-2 px-[10px] py-2">
        <span
          v-for="(height, index) in chartModel.bars"
          :key="index"
          class="w-[18px] shrink-0"
          :class="barClass"
          :style="{ height: `${height}px` }"
        />
      </div>

      <div
        v-if="chartModel.baselineStatus"
        class="h-[2px] w-full"
        :class="baselineClass"
      />
    </div>
  </div>
</template>
