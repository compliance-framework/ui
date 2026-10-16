<template>
  <NoActiveSystem v-if="showOnboarding" subject="risks" />
  <div v-else class="space-y-6">
    <template v-if="isActiveSystemPage">
      <PageHeader>Risks</PageHeader>
      <PageSubHeader>
        Risk posture and register for {{ systemTitle }}
      </PageSubHeader>
    </template>

    <!-- The dashboard used to sit on the SSP Overview; it lives next to the register now.
         Its widgets drill into the register by pushing filters plus view=register into the
         query string, which the register panel already follows. -->
    <Tabs :value="activeTab" @update:value="chooseTab">
      <TabList>
        <Tab value="dashboard">Dashboard</Tab>
        <Tab value="register">Register</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="dashboard">
          <!-- v-if: charts measure their container, which is zero-sized while hidden. -->
          <RiskOverviewSection
            v-if="sspId && activeTab === 'dashboard'"
            :ssp-id="sspId"
            :risk-list-route-name="riskListRouteName"
            :show-register-link="false"
            :register-query="{ view: 'register' }"
          />
        </TabPanel>
        <TabPanel value="register">
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
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
import Tabs from '@/volt/Tabs.vue';
import TabList from '@/volt/TabList.vue';
import Tab from '@/volt/Tab.vue';
import TabPanels from '@/volt/TabPanels.vue';
import TabPanel from '@/volt/TabPanel.vue';

const route = useRoute();
const router = useRouter();
const { system } = useSystemStore();

type RisksTab = 'dashboard' | 'register';

// The tab lives in the query (?view=register) so dashboard drill-downs, bookmarks and the
// browser's back button all land on the right one. A link that carries register filters
// but no view (e.g. from a control's risk badge) opens the register too.
const activeTab = computed<RisksTab>(() => {
  const view = route.query.view;
  if (view === 'dashboard' || view === 'register') return view;
  const hasFilters = Object.keys(route.query).length > 0;
  return hasFilters ? 'register' : 'dashboard';
});

function chooseTab(value: string | number) {
  if (value === activeTab.value) return;
  void router.replace({ query: { ...route.query, view: String(value) } });
}

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
