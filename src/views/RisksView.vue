<template>
  <RiskRegisterPanel
    :risks="risks || []"
    :loading="loading"
    :error="error ? String(error) : null"
    :context-missing="contextMissing"
    :ssp-id="sspId"
    title="SSP Risk Register"
    @risk-created="handleRiskCreated"
    @risk-updated="handleRiskSaved"
    @risk-deleted="handleRiskDeleted"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { type Risk } from '@/oscal';
import { useSystemStore } from '@/stores/system.ts';
import { useDataApi } from '@/composables/axios';
import { sameRiskIdentifier } from '@/utils/risk-id';
import RiskRegisterPanel from '@/components/risk/RiskRegisterPanel.vue';

const route = useRoute();
const { system } = useSystemStore();

const sspId = computed(
  () =>
    (route.params.id as string | undefined) || system.securityPlan?.uuid || '',
);

const contextMissing = computed(() => !sspId.value);

const endpoint = computed(() => {
  if (!sspId.value) return null;
  return `/api/oscal/system-security-plans/${sspId.value}/risks`;
});

const {
  data: risks,
  error,
  isLoading: loading,
  execute: loadRisks,
} = useDataApi<Risk[]>(null, {}, { immediate: false });

watch(
  endpoint,
  async (value) => {
    if (!value) {
      risks.value = [];
      return;
    }
    try {
      await loadRisks(value);
    } catch {
      // Error state is already captured by useDataApi().error.
    }
  },
  { immediate: true },
);

interface RiskUpdatedDetail {
  risk: Risk;
  context?: { scope: 'poam' | 'ssp'; id: string };
  sspId?: string;
}

const handleRiskUpdated = (event: Event) => {
  const detail = (event as CustomEvent<RiskUpdatedDetail>).detail;
  if (!detail?.risk || !risks.value || !sspId.value) return;

  if (detail.context && detail.context.scope !== 'ssp') {
    return;
  }

  if (detail.context && detail.context.id !== sspId.value) {
    return;
  }

  if (detail.sspId && detail.sspId !== sspId.value) return;

  const index = risks.value.findIndex((item) =>
    sameRiskIdentifier(item, detail.risk),
  );
  if (index !== -1) {
    risks.value[index] = detail.risk;
  }
};

onMounted(() => {
  window.addEventListener('risk-updated', handleRiskUpdated as EventListener);
});

onUnmounted(() => {
  window.removeEventListener(
    'risk-updated',
    handleRiskUpdated as EventListener,
  );
});

function handleRiskCreated(newRisk: Risk) {
  if (!risks.value) {
    risks.value = [];
  }
  risks.value.push(newRisk);
}

function handleRiskSaved(updatedRisk: Risk) {
  if (!risks.value || !updatedRisk) return;
  const index = risks.value.findIndex((risk) =>
    sameRiskIdentifier(risk, updatedRisk),
  );
  if (index !== -1) {
    risks.value[index] = updatedRisk;
  }
}

async function handleRiskDeleted() {
  if (endpoint.value) {
    try {
      await loadRisks(endpoint.value);
    } catch {
      // Error state is captured by useDataApi
    }
  }
}
</script>
