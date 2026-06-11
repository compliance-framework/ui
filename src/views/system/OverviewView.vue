<template>
  <div class="p-4">
    <div
      v-if="systemSecurityPlan.metadata"
      class="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      <div
        v-for="field in metadataFields"
        :key="field.label"
        :class="field.class"
      >
        <p
          class="text-xs font-medium uppercase text-gray-500 dark:text-slate-400"
        >
          {{ field.label }}
        </p>
        <p
          class="mt-1 text-sm text-gray-900 dark:text-slate-200"
          :class="{ 'font-mono text-gray-600 dark:text-slate-400': field.mono }"
        >
          {{ field.value }}
        </p>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >Profiles</label
        >
        <MultiSelect
          placeholder="Select profiles"
          :loading="loadingProfiles"
          :disabled="profileSaveInProgress"
          display="chip"
          class="w-full"
          v-model="selectedProfiles"
          :options="profileItems"
          optionLabel="name"
          optionValue="value"
        />
      </div>
    </div>

    <div v-else class="text-center py-4">
      <p class="text-gray-500 dark:text-slate-400">Loading metadata...</p>
    </div>

    <div
      class="mt-8 rounded-lg border border-ccf-300 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
    >
      <div class="mb-4 flex items-center justify-between gap-3">
        <TooltipTitle
          text="Compliance"
          tooltip-key="system.compliance"
          underline-class="text-lg font-semibold text-gray-900 dark:text-slate-300 underline decoration-dotted cursor-help"
        />
        <RouterLinkButton
          v-if="systemSecurityPlan.uuid"
          :to="{
            name: 'system-security-plan-compliance',
            params: { id: systemSecurityPlan.uuid },
          }"
          variant="outlined"
        >
          Open full compliance view
        </RouterLinkButton>
      </div>

      <div
        v-if="loadingCompliancePreview"
        class="text-sm text-gray-500 dark:text-slate-400"
      >
        Loading compliance progress...
      </div>

      <template v-else-if="compliancePreview?.summary">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div
            v-for="stat in complianceStats"
            :key="stat.label"
            class="rounded-md border border-ccf-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
          >
            <div class="flex items-center justify-between gap-3">
              <p
                class="text-xs font-medium uppercase text-gray-500 dark:text-slate-400"
              >
                {{ stat.label }}
              </p>
              <i
                v-if="stat.icon"
                :class="stat.icon"
                class="text-sm text-gray-400 dark:text-slate-500"
              ></i>
            </div>
            <p
              class="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100"
            >
              {{ stat.value }}
            </p>
          </div>
        </div>

        <div
          class="mt-5 rounded-md border border-ccf-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p
                class="text-xs font-medium uppercase text-gray-500 dark:text-slate-400"
              >
                Controls Satisfied
              </p>
              <p class="mt-1 text-sm text-gray-900 dark:text-slate-200">
                {{ compliancePreview.summary.satisfied }}/{{
                  compliancePreview.summary.totalControls
                }}
                controls satisfied ({{
                  compliancePreview.summary.compliancePercent
                }}%)
              </p>
            </div>
            <div v-if="compliancePreview.implementation">
              <p
                class="text-xs font-medium uppercase text-gray-500 dark:text-slate-400"
              >
                Implementation Coverage
              </p>
              <p class="mt-1 text-sm text-gray-900 dark:text-slate-200">
                {{ compliancePreview.implementation.implementationPercent }}%
                ({{ compliancePreview.implementation.implementedControls }}
                implemented,
                {{ compliancePreview.implementation.unimplementedControls }}
                not implemented)
              </p>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="text-sm text-gray-500 dark:text-slate-400">
        Select a profile to view compliance posture.
      </div>
    </div>

    <div class="mt-8">
      <RiskOverviewSection
        :ssp-id="systemSecurityPlan.uuid || system.securityPlan?.uuid || ''"
        risk-list-route-name="system:risks"
      />
    </div>

    <!-- System Characteristics Summary -->
    <template v-if="systemCharacteristics">
      <!--      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-300">-->
      <!--        System Characteristics Summary-->
      <!--      </h3>-->

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div
          v-for="field in systemCharacteristicFields"
          :key="field.label"
          :class="field.class"
        >
          <p
            class="text-xs font-medium uppercase text-gray-500 dark:text-slate-400"
          >
            {{ field.label }}
          </p>
          <p class="mt-1 text-sm text-gray-900 dark:text-slate-200">
            {{ field.value }}
          </p>
        </div>
      </div>
    </template>

    <Diagrams></Diagrams>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import type { SystemSecurityPlan, SystemCharacteristics } from '@/oscal';
import type { Profile } from '@/oscal';
import MultiSelect from '@/volt/MultiSelect.vue';
import { useSystemStore } from '@/stores/system.ts';
import Diagrams from './DiagramsView.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';
import type { ProfileComplianceProgress } from '@/types/compliance';
import RiskOverviewSection from '@/components/system-security-plans/RiskOverviewSection.vue';
import { useSspProfileBindings } from '@/composables/useSspProfileBindings';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import TooltipTitle from '@/components/TooltipTitle.vue';

const toast = useToast();
const { system } = useSystemStore();
const systemSecurityPlan = ref<SystemSecurityPlan>({} as SystemSecurityPlan);

const profileItems = ref<Array<{ name: string; value: string }>>([]);
const { data: profiles, isLoading: loadingProfiles } = useDataApi<Profile[]>(
  '/api/oscal/profiles',
);

watch(profiles, () => {
  profileItems.value =
    profiles.value?.map((item) => {
      return {
        name: item.metadata.title,
        value: item.uuid,
      };
    }) || [];
});

const { data: systemCharacteristics } = useDataApi<SystemCharacteristics>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/system-characteristics`,
);

const compliancePreview = ref<ProfileComplianceProgress | null>(null);
const loadingCompliancePreview = ref(false);

type DisplayField = {
  label: string;
  value: string;
  class?: string;
  mono?: boolean;
};

const metadataFields = computed(() => {
  const metadata = systemSecurityPlan.value.metadata;
  if (!metadata) return [];

  const fields: DisplayField[] = [
    { label: 'Title', value: metadata.title || 'N/A' },
    {
      label: 'UUID',
      value: systemSecurityPlan.value.uuid || 'N/A',
      mono: true,
    },
    { label: 'Version', value: metadata.version || 'N/A' },
    {
      label: 'Last Modified',
      value: formatDate(metadata.lastModified),
    },
    ...(metadata.published
      ? [{ label: 'Published', value: formatDate(metadata.published) }]
      : []),
  ];

  return fields;
});

const complianceStats = computed(() => {
  const summary = compliancePreview.value?.summary;
  if (!summary) return [];

  return [
    {
      label: 'Satisfied',
      value: summary.satisfied,
      icon: 'pi pi-check-circle',
    },
    {
      label: 'Not Satisfied',
      value: summary.notSatisfied,
      icon: 'pi pi-times-circle',
    },
    { label: 'Unknown', value: summary.unknown, icon: 'pi pi-question-circle' },
    {
      label: 'Compliance',
      value: `${summary.compliancePercent}%`,
      icon: 'pi pi-chart-line',
    },
    {
      label: 'Assessed',
      value: `${summary.assessedPercent}%`,
      icon: 'pi pi-verified',
    },
  ];
});

const systemCharacteristicFields = computed(() => {
  if (!systemCharacteristics.value) return [];

  return [
    {
      label: 'System Name',
      value: systemCharacteristics.value.systemName,
    },
    {
      label: 'System Name (Short)',
      value: systemCharacteristics.value.systemNameShort,
    },
    {
      label: 'Security Sensitivity Level',
      value: systemCharacteristics.value.securitySensitivityLevel,
    },
    {
      label: 'Date Authorized',
      value: systemCharacteristics.value.dateAuthorized
        ? formatDate(systemCharacteristics.value.dateAuthorized.toString())
        : undefined,
    },
    {
      label: 'Remarks',
      value: systemSecurityPlan.value.metadata?.remarks,
      class: 'md:col-span-2',
    },
    {
      label: 'Description',
      value: systemCharacteristics.value.description,
      class: 'md:col-span-2',
    },
  ].filter((field) => !!field.value);
});

const { execute: executeCompliance } = useDataApi<ProfileComplianceProgress>(
  null,
  null,
  { immediate: false },
);

async function loadCompliancePreview(profileId?: string) {
  const sspId = system.securityPlan?.uuid || systemSecurityPlan.value.uuid;
  if (!profileId || !sspId) {
    compliancePreview.value = null;
    return;
  }

  loadingCompliancePreview.value = true;
  try {
    const { data } = await executeCompliance(
      `/api/oscal/profiles/${profileId}/compliance-progress?includeControls=false&sspId=${sspId}`,
    );
    compliancePreview.value = data.value?.data || null;
  } catch (error) {
    compliancePreview.value = null;

    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    if (errorResponse.response?.status !== 404) {
      toast.add({
        severity: 'error',
        summary: 'Error loading compliance progress',
        detail:
          errorResponse.response?.data.errors.body ||
          'Unable to load compliance progress.',
        life: 3000,
      });
    }
  } finally {
    loadingCompliancePreview.value = false;
  }
}

const { selectedProfiles, profileSaveInProgress, loadInitialProfiles } =
  useSspProfileBindings(
    () => systemSecurityPlan.value?.uuid,
    async (currentProfiles) => {
      await loadCompliancePreview(currentProfiles[0]);
    },
  );

onMounted(async () => {
  try {
    // Load basic SSP data
    systemSecurityPlan.value = system.securityPlan as SystemSecurityPlan;

    await loadInitialProfiles();
    await loadCompliancePreview(selectedProfiles.value[0]);
  } catch (error) {
    console.error('Error loading System Security Plan overview:', error);
  }
});

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}
</script>
