<template>
  <NoActiveSystem v-if="showOnboarding" subject="risks" />
  <div v-else class="space-y-6">
    <template v-if="isActiveSystemPage">
      <PageHeader>Risks</PageHeader>
      <PageSubHeader>
        Risk posture and register for {{ systemTitle }}
      </PageSubHeader>
    </template>

    <!-- The dashboard used to sit on the SSP Overview; it lives next to the register now so
         the summary and the list it drills into are on one page. Its widgets push register
         filters into the query string, which the panel below already follows. -->
    <RiskOverviewSection
      v-if="sspId"
      :ssp-id="sspId"
      :risk-list-route-name="riskListRouteName"
      :show-register-link="false"
    />

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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { type Risk } from '@/oscal';
import { useSystemStore } from '@/stores/system.ts';
import { useDataApi } from '@/composables/axios';
import { sameRiskIdentifier } from '@/utils/risk-id';
import RiskRegisterPanel from '@/components/risk/RiskRegisterPanel.vue';
import RiskOverviewSection, {
  type RiskListRouteName,
} from '@/components/system-security-plans/RiskOverviewSection.vue';
import NoActiveSystem from '@/components/system/NoActiveSystem.vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';

const route = useRoute();
const { system } = useSystemStore();

const sspId = computed(
  () =>
    (route.params.id as string | undefined) || system.securityPlan?.uuid || '',
);

const contextMissing = computed(() => !sspId.value);

// This view backs both This System > Risks (active SSP) and the SSP Editor's Risks tab
// (`:id` route param). Only the former gets a page header and the onboarding empty state.
const isActiveSystemPage = computed(() => !route.params.id);
const showOnboarding = computed(
  () => isActiveSystemPage.value && contextMissing.value,
);
const riskListRouteName = computed<RiskListRouteName>(() =>
  isActiveSystemPage.value ? 'risks:index' : 'system-security-plan-risks',
);
const systemTitle = computed(
  () => system.securityPlan?.metadata?.title || 'this system',
);

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
    risks.value = [newRisk];
  } else {
    risks.value = [...risks.value, newRisk];
  }
}

function handleRiskSaved(updatedRisk: Risk) {
  if (!risks.value || !updatedRisk) return;
  const index = risks.value.findIndex((risk) =>
    sameRiskIdentifier(risk, updatedRisk),
  );
  if (index !== -1) {
    risks.value = [
      ...risks.value.slice(0, index),
      updatedRisk,
      ...risks.value.slice(index + 1),
    ];
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
