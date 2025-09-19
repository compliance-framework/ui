<template>
  <div class="p-6 space-y-6">
    <PageHeader>{{ pageTitle }}</PageHeader>

    <Message v-if="contextMissing" severity="error" variant="outlined">
      <h4 class="font-bold">Missing context</h4>
      <p class="text-sm">
        Unable to determine the Plan of Action and Milestones that owns this
        risk. Select a POA&amp;M and try again.
      </p>
    </Message>

    <div v-else class="space-y-6">
      <div v-if="loading" class="text-sm text-gray-600 dark:text-slate-400">
        Loading risk details...
      </div>

      <Message v-else-if="loadError" severity="error" variant="outlined">
        <h4 class="font-bold">Error loading risk</h4>
        <p class="text-sm">{{ loadError }}</p>
      </Message>

      <Message v-else-if="notFound" severity="warn" variant="outlined">
        <h4 class="font-bold">Risk not found</h4>
        <p class="text-sm">The requested risk could not be located.</p>
      </Message>

      <div v-else-if="risk" class="space-y-6">
        <div
          class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6 space-y-4"
        >
          <div class="flex flex-col gap-2">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-slate-200">
              {{ risk.title || 'Untitled Risk' }}
            </h2>
            <div class="text-sm text-gray-700 dark:text-slate-300">
              {{ risk.description }}
            </div>
            <div
              v-if="risk.statement"
              class="text-sm text-gray-600 dark:text-slate-300"
            >
              <span class="font-semibold">Statement:</span>
              <span class="ml-1">{{ risk.statement }}</span>
            </div>
          </div>

          <div
            class="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-slate-300"
          >
            <div>
              <span class="font-semibold">Status:</span>
              <span class="ml-1 capitalize">{{ risk.status }}</span>
            </div>
            <div>
              <span class="font-semibold">Deadline:</span>
              <span class="ml-1">{{ formatDate(risk.deadline) }}</span>
            </div>
            <div>
              <span class="font-semibold">Threat IDs:</span>
              <span class="ml-1">
                <template v-if="risk.threatIds?.length">
                  {{ risk.threatIds.join(', ') }}
                </template>
                <template v-else>None</template>
              </span>
            </div>
          </div>
        </div>

        <div
          class="border-b border-ccf-300 dark:border-slate-700 flex flex-wrap gap-2 pb-2"
        >
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="px-3 py-1 rounded-md text-sm"
            :class="
              tab.id === activeTab
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            "
          >
            {{ tab.label }}
          </button>
        </div>

        <div>
          <div v-if="activeTab === 'overview'" class="space-y-4">
            <div
              v-if="risk.remarks"
              class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
            >
              <h3
                class="text-sm font-semibold text-gray-800 dark:text-slate-200"
              >
                Remarks
              </h3>
              <p class="text-sm text-gray-700 dark:text-slate-300 mt-2">
                {{ risk.remarks }}
              </p>
            </div>

            <div
              v-if="risk.relatedObservations?.length"
              class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
            >
              <h3
                class="text-sm font-semibold text-gray-800 dark:text-slate-200"
              >
                Related Observations
              </h3>
              <ul
                class="list-disc list-inside text-sm text-gray-700 dark:text-slate-300 mt-2"
              >
                <li v-for="obs in risk.relatedObservations" :key="obs">
                  {{ obs }}
                </li>
              </ul>
            </div>
          </div>

          <RiskCharacterizationsTab
            v-else-if="activeTab === 'characterizations'"
            :risk="risk"
            :saving="saving"
            @save="handleCharacterizationsSave"
          />

          <RiskMitigationsTab
            v-else-if="activeTab === 'mitigations'"
            :risk="risk"
            :saving="saving"
            @save="handleMitigationsSave"
          />

          <RiskRemediationsTab
            v-else-if="activeTab === 'remediations'"
            :risk="risk"
            :saving="saving"
            @save="handleRemediationsSave"
          />

          <RiskLogTab
            v-else-if="activeTab === 'log'"
            :entries="risk.riskLog?.entries"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import Message from '@/volt/Message.vue';
import RiskCharacterizationsTab from '@/components/risk/RiskCharacterizationsTab.vue';
import RiskMitigationsTab from '@/components/risk/RiskMitigationsTab.vue';
import RiskRemediationsTab from '@/components/risk/RiskRemediationsTab.vue';
import RiskLogTab from '@/components/risk/RiskLogTab.vue';
import { useSystemStore } from '@/stores/system';
import type { Risk } from '@/stores/plan-of-action-and-milestones';
import type { Characterization, MitigatingFactor, Response } from '@/oscal';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { cloneFnJSON as cloneDeep } from '@vueuse/core';

const route = useRoute();
const toast = useToast();
const systemStore = useSystemStore();

const riskId = computed(() => route.params.riskId as string | undefined);
const poamId = computed(
  () =>
    (route.params.id as string | undefined) ?? systemStore.system.poam?.uuid,
);

const contextMissing = computed(() => !poamId.value || !riskId.value);

const riskListEndpoint = computed(() => {
  if (!poamId.value) return null;
  return `/api/oscal/plan-of-action-and-milestones/${poamId.value}/risks`;
});

const {
  data: fetchedRisks,
  isLoading: loading,
  error,
  execute: executeFetchRisks,
} = useDataApi<Risk[]>(null, {}, { immediate: false });

const endpoint = computed(() => {
  if (contextMissing.value) return null;
  return `/api/oscal/plan-of-action-and-milestones/${poamId.value}/risks/${riskId.value}`;
});

const {
  data: savedRisk,
  isLoading: saving,
  execute: executeSave,
} = useDataApi<Risk>(
  null,
  { method: 'PUT', transformRequest: [decamelizeKeys] },
  { immediate: false },
);

const risk = ref<Risk | null>(null);
const notFound = ref(false);

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'characterizations', label: 'Characterizations' },
  { id: 'mitigations', label: 'Mitigations' },
  { id: 'remediations', label: 'Remediations' },
  { id: 'log', label: 'Log' },
] as const;

const activeTab = ref<(typeof tabs)[number]['id']>('overview');

const pageTitle = computed(() =>
  risk.value?.title ? `Risk: ${risk.value.title}` : 'Risk Detail',
);

const loadError = computed(() => {
  if (!error.value) return '';
  const errVal = error.value as { message?: string; code?: string };
  const message = errVal?.message ?? String(error.value);
  if (errVal?.code === 'ERR_CANCELED') return '';
  if (message.toLowerCase() === 'canceled') return '';
  return message;
});

const selectRiskFromList = () => {
  if (!fetchedRisks.value || !riskId.value) return;
  const match = fetchedRisks.value.find((item) => item.uuid === riskId.value);
  if (match) {
    risk.value = cloneDeep(match);
    notFound.value = false;
  } else {
    risk.value = null;
    notFound.value = true;
  }
};

watch([fetchedRisks, riskId], () => {
  selectRiskFromList();
});

watch(
  riskListEndpoint,
  (val) => {
    if (!val) return;
    executeFetchRisks(val);
  },
  { immediate: true },
);

onMounted(async () => {
  if (contextMissing.value) {
    toast.add({
      severity: 'error',
      summary: 'Missing context',
      detail: 'Select a Plan of Action and Milestones to view this risk.',
      life: 4000,
    });
    return;
  }

  try {
    if (riskListEndpoint.value) {
      await executeFetchRisks(riskListEndpoint.value);
    }
    selectRiskFromList();
  } catch (err) {
    const maybeError = err as { message?: string; code?: string };
    const message = maybeError?.message ?? 'Unable to load risk.';
    if (
      maybeError?.code === 'ERR_CANCELED' ||
      message.toLowerCase() === 'canceled'
    ) {
      return;
    }
    toast.add({
      severity: 'error',
      summary: 'Load failed',
      detail: message,
      life: 4000,
    });
  }
});

function formatDate(date?: string) {
  if (!date) return 'None';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleString();
}

function notifyRiskUpdated(updatedRisk: Risk) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('risk-updated', {
      detail: {
        risk: cloneDeep(updatedRisk),
        poamId: poamId.value,
      },
    }),
  );
}

async function saveRisk(nextRisk: Risk, successMessage: string) {
  if (contextMissing.value || !endpoint.value) return;
  try {
    await executeSave(endpoint.value, { data: nextRisk });
    if (savedRisk.value) {
      risk.value = cloneDeep(savedRisk.value);
    } else {
      risk.value = cloneDeep(nextRisk);
    }
    if (risk.value) {
      notifyRiskUpdated(risk.value);
    }
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: successMessage,
      life: 3000,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save risk.';
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: message,
      life: 4000,
    });
    throw err;
  }
}

async function handleCharacterizationsSave(updated: Characterization[]) {
  if (!risk.value) return;
  const payload: Risk = {
    ...cloneDeep(risk.value),
    characterizations: updated,
  };
  await saveRisk(payload, 'Characterizations updated');
}

async function handleMitigationsSave(updated: MitigatingFactor[]) {
  if (!risk.value) return;
  const payload: Risk = {
    ...cloneDeep(risk.value),
    mitigatingFactors: updated,
  };
  await saveRisk(payload, 'Mitigating factors updated');
}

async function handleRemediationsSave(updated: Response[]) {
  if (!risk.value) return;
  const payload: Risk = {
    ...cloneDeep(risk.value),
    remediations: updated,
  };
  await saveRisk(payload, 'Remediations updated');
}
</script>
