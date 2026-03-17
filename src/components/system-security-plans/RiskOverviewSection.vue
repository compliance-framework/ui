<template>
  <div
    class="rounded-lg border border-ccf-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
  >
    <div class="mb-4 flex items-center justify-between gap-2">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">
        Risk Overview
      </h3>
      <button
        type="button"
        class="text-sm font-medium text-blue-600 underline dark:text-blue-300"
        @click="navigateToRiskList()"
      >
        Open risk register
      </button>
    </div>

    <div v-if="loading" class="text-sm text-gray-500 dark:text-slate-400">
      Loading risk overview...
    </div>

    <div v-else-if="loadError" class="text-sm text-red-600 dark:text-red-300">
      Unable to load risk overview data.
    </div>

    <div v-else class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <RiskStatusBreakdownWidget
        :status-items="statusBreakdown"
        @navigate="navigateToRiskList"
      />
      <RiskSeverityHeatmapWidget
        :cells="severityHeatmap.cells"
        :max-count="severityHeatmap.maxCount"
        @navigate="navigateToRiskList"
      />
      <OverdueReviewsWidget
        :items="overdueRisks"
        @navigate="navigateToRiskList"
      />
      <TopRisksWidget :items="topRisks" @navigate="navigateToRiskList" />
      <RiskTrendWidget
        :range-days="trendRangeDays"
        :points="trendPoints"
        @update:range-days="trendRangeDays = $event"
        @navigate="navigateToRiskList"
      />
      <AcceptanceMetricsWidget
        :metrics="acceptanceMetrics"
        @navigate="navigateToRiskList"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { Risk } from '@/oscal';
import { useDataApi } from '@/composables/axios';
import RiskStatusBreakdownWidget from '@/components/system-security-plans/risk-widgets/RiskStatusBreakdownWidget.vue';
import RiskSeverityHeatmapWidget from '@/components/system-security-plans/risk-widgets/RiskSeverityHeatmapWidget.vue';
import OverdueReviewsWidget from '@/components/system-security-plans/risk-widgets/OverdueReviewsWidget.vue';
import TopRisksWidget from '@/components/system-security-plans/risk-widgets/TopRisksWidget.vue';
import RiskTrendWidget from '@/components/system-security-plans/risk-widgets/RiskTrendWidget.vue';
import AcceptanceMetricsWidget from '@/components/system-security-plans/risk-widgets/AcceptanceMetricsWidget.vue';
import {
  buildRiskSeverityHeatmap,
  buildRiskStatusBreakdown,
  buildRiskTrend,
  computeRiskAcceptanceMetrics,
  listOverdueRisks,
  listTopOpenRisks,
} from '@/utils/risk-dashboard';

type RiskListRouteName =
  | 'system-security-plan-risks'
  | 'risks:index'
  | 'system:risks';

const props = defineProps<{
  sspId: string;
  riskListRouteName: RiskListRouteName;
}>();

const router = useRouter();
const trendRangeDays = ref<30 | 60 | 90>(30);

const {
  data: risks,
  execute: loadRisks,
  error,
  isLoading: loading,
} = useDataApi<Risk[]>(null, null, { immediate: false, initialData: [] });

watch(
  () => props.sspId,
  async (nextSspId) => {
    if (!nextSspId) {
      risks.value = [];
      error.value = undefined;
      return;
    }

    try {
      await loadRisks(`/api/oscal/system-security-plans/${nextSspId}/risks`);
    } catch {
      // useDataApi stores the error state.
    }
  },
  { immediate: true },
);

const loadError = computed(() => !!error.value);
const statusBreakdown = computed(() =>
  buildRiskStatusBreakdown(risks.value || []),
);
const severityHeatmap = computed(() =>
  buildRiskSeverityHeatmap(risks.value || []),
);
const overdueRisks = computed(() => listOverdueRisks(risks.value || []));
const topRisks = computed(() => listTopOpenRisks(risks.value || [], 5));
const acceptanceMetrics = computed(() =>
  computeRiskAcceptanceMetrics(risks.value || []),
);
const trendPoints = computed(() =>
  buildRiskTrend(risks.value || [], trendRangeDays.value),
);

function navigateToRiskList(query: Record<string, string> = {}) {
  if (
    props.riskListRouteName === 'system-security-plan-risks' &&
    !props.sspId
  ) {
    return;
  }

  const routeTarget =
    props.riskListRouteName === 'system-security-plan-risks'
      ? {
          name: props.riskListRouteName,
          params: { id: props.sspId },
          query,
        }
      : {
          name: props.riskListRouteName,
          query,
        };

  void router.push(routeTarget);
}
</script>
