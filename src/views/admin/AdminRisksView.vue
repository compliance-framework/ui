<template>
  <RiskRegisterPanel
    :risks="allRisks"
    :loading="loadingAnySsp"
    :error="globalError"
    :context-missing="false"
    :ssp-id="null"
    :ssp-map="sspTitleMap"
    :risk-ssp-ids="riskSspIdMap"
    :available-ssps="sspOptions"
    :enable-bulk-ops="true"
    :page-size="pageSize"
    title="Admin Risk Register"
    @risk-created="handleRiskCreated"
    @risk-updated="handleRiskUpdated"
    @risk-deleted="handleRiskDeleted"
    @refresh-requested="handleRefreshRequested"
  />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { type Risk, type SystemSecurityPlan } from '@/oscal';
import { useDataApi } from '@/composables/axios';
import RiskRegisterPanel, {
  type SspOption,
} from '@/components/risk/RiskRegisterPanel.vue';
import { getRiskIdentifier, sameRiskIdentifier } from '@/utils/risk-id';

const pageSize = 25;

const {
  data: ssps,
  isLoading: loadingSSPs,
  error: sspError,
  execute: loadSSPs,
} = useDataApi<SystemSecurityPlan[]>(null, {}, { immediate: false });

const {
  data: risks,
  isLoading: loadingRisks,
  error: risksError,
  execute: loadRisks,
} = useDataApi<Risk[]>(null, {}, { immediate: false });

const sspTitleMap = computed<Record<string, string>>(() => {
  if (!ssps.value) return {};
  const map: Record<string, string> = {};
  for (const ssp of ssps.value) {
    if (ssp.uuid) {
      map[ssp.uuid] = ssp.metadata?.title ?? ssp.uuid;
    }
  }
  return map;
});

const sspOptions = computed<SspOption[]>(() => {
  if (!ssps.value) return [];
  return ssps.value
    .filter((ssp) => !!ssp.uuid)
    .map((ssp) => ({
      uuid: ssp.uuid!,
      title: ssp.metadata?.title ?? ssp.uuid!,
    }));
});

const allRisks = computed<Risk[]>(() => {
  return risks.value || [];
});

const riskSspIdMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  if (!risks.value) return map;

  for (const risk of risks.value) {
    const id = getRiskIdentifier(risk);
    if (id) {
      // The API returns ssp-id but it gets mapped to the Risk object
      // Check for the SSP ID in the risk's properties
      const riskData = risk as unknown as Record<string, unknown>;
      const sspId = riskData['ssp-id'] || riskData.sspId;
      if (sspId && typeof sspId === 'string') {
        map[id] = sspId;
      }
    }
  }
  return map;
});

const loadingAnySsp = computed(() => loadingSSPs.value || loadingRisks.value);

const globalError = computed<string | null>(() => {
  if (sspError.value) return String(sspError.value);
  if (risksError.value) return String(risksError.value);
  return null;
});

onMounted(async () => {
  try {
    await Promise.all([
      loadSSPs('/api/oscal/system-security-plans'),
      loadRisks('/api/risks'),
    ]);
  } catch {
    // errors already captured in sspError and risksError
  }
});

async function handleRiskCreated() {
  // Reload risks to ensure SSP ID mapping is correct
  await loadRisks('/api/risks');
}

function handleRiskUpdated(updatedRisk: Risk) {
  if (!risks.value) return;

  const index = risks.value.findIndex((risk) =>
    sameRiskIdentifier(risk, updatedRisk),
  );
  if (index !== -1) {
    // Preserve SSP association fields from the original risk
    const existingRisk = risks.value[index] as Risk & Record<string, unknown>;
    const mergedRisk = { ...updatedRisk } as Risk & Record<string, unknown>;

    // Preserve SSP ID fields if they exist in the original risk
    if (existingRisk['ssp-id']) {
      mergedRisk['ssp-id'] = existingRisk['ssp-id'];
    }
    if (existingRisk['sspId']) {
      mergedRisk['sspId'] = existingRisk['sspId'];
    }

    risks.value = [
      ...risks.value.slice(0, index),
      mergedRisk as Risk,
      ...risks.value.slice(index + 1),
    ];
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleRiskDeleted(riskId: string, _sspId: string) {
  if (!risks.value) return;

  risks.value = risks.value.filter(
    (risk) => getRiskIdentifier(risk) !== riskId,
  );
}

async function handleRefreshRequested() {
  await loadRisks('/api/risks');
}
</script>
