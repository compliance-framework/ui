<template>
  <!--    <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-300">-->
  <!--      System Security Plan-->
  <!--    </h3>-->
  <div class="p-4">
    <div
      v-if="systemSecurityPlan.metadata"
      class="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >Title</label
        >
        <p class="text-gray-900 dark:text-slate-300">
          {{ systemSecurityPlan.metadata.title }}
        </p>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >UUID</label
        >
        <p class="text-sm text-gray-600 dark:text-slate-400 font-mono">
          {{ systemSecurityPlan.uuid }}
        </p>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >Version</label
        >
        <p class="text-gray-900 dark:text-slate-300">
          {{ systemSecurityPlan.metadata.version || 'N/A' }}
        </p>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >Last Modified</label
        >
        <p class="text-gray-900 dark:text-slate-300">
          {{ formatDate(systemSecurityPlan.metadata.lastModified) }}
        </p>
      </div>

      <div v-if="systemSecurityPlan.metadata.published">
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >Published</label
        >
        <p class="text-gray-900 dark:text-slate-300">
          {{ formatDate(systemSecurityPlan.metadata.published) }}
        </p>
      </div>

      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >Profile</label
        >
        <Select
          placeholder="Profile"
          :loading="loadingProfiles"
          checkmark
          class="w-full"
          v-model="selectedProfile"
          :options="profileItems"
          optionLabel="name"
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
        <h3 class="text-lg font-semibold text-gray-900 dark:text-slate-300">
          Compliance
        </h3>
        <RouterLink
          v-if="systemSecurityPlan.uuid"
          :to="{
            name: 'system-security-plan-compliance',
            params: { id: systemSecurityPlan.uuid },
          }"
          class="text-sm font-medium text-blue-600 underline dark:text-blue-300"
        >
          Open full compliance view
        </RouterLink>
      </div>

      <div
        v-if="loadingCompliancePreview"
        class="text-sm text-gray-500 dark:text-slate-400"
      >
        Loading compliance progress...
      </div>

      <template v-else-if="compliancePreview?.summary">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p class="text-xs uppercase tracking-wide text-emerald-700">
              Satisfied
            </p>
            <p class="mt-2 text-3xl font-semibold text-emerald-800">
              {{ compliancePreview.summary.satisfied }}
            </p>
          </div>
          <div class="rounded-lg border border-red-200 bg-red-50 p-4">
            <p class="text-xs uppercase tracking-wide text-red-700">
              Not Satisfied
            </p>
            <p class="mt-2 text-3xl font-semibold text-red-800">
              {{ compliancePreview.summary.notSatisfied }}
            </p>
          </div>
          <div class="rounded-lg border border-slate-300 bg-slate-100 p-4">
            <p class="text-xs uppercase tracking-wide text-slate-700">
              Unknown
            </p>
            <p class="mt-2 text-3xl font-semibold text-slate-800">
              {{ compliancePreview.summary.unknown }}
            </p>
          </div>
          <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p class="text-xs uppercase tracking-wide text-blue-700">
              Compliance
            </p>
            <p class="mt-2 text-3xl font-semibold text-blue-800">
              {{ compliancePreview.summary.compliancePercent }}%
            </p>
          </div>
          <div class="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <p class="text-xs uppercase tracking-wide text-indigo-700">
              Assessed
            </p>
            <p class="mt-2 text-3xl font-semibold text-indigo-800">
              {{ compliancePreview.summary.assessedPercent }}%
            </p>
          </div>
        </div>

        <div class="mt-5">
          <div class="mb-2 flex items-center justify-between text-sm">
            <span class="text-gray-600 dark:text-slate-400">
              {{ compliancePreview.summary.satisfied }}/{{
                compliancePreview.summary.totalControls
              }}
              controls satisfied
            </span>
            <span class="font-semibold text-gray-900 dark:text-slate-200">
              {{ compliancePreview.summary.compliancePercent }}%
            </span>
          </div>
          <div
            class="flex h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-slate-700"
          >
            <div
              class="bg-emerald-600"
              :style="{
                width: `${satisfiedWidth(compliancePreview.summary)}%`,
              }"
            ></div>
            <div
              class="bg-red-500"
              :style="{
                width: `${notSatisfiedWidth(compliancePreview.summary)}%`,
              }"
            ></div>
            <div
              class="bg-slate-400"
              :style="{ width: `${unknownWidth(compliancePreview.summary)}%` }"
            ></div>
          </div>
        </div>

        <div
          v-if="compliancePreview.implementation"
          class="mt-4 rounded-lg border border-ccf-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <div class="mb-2 flex items-center justify-between text-sm">
            <span class="text-gray-600 dark:text-slate-400">
              Implementation Coverage
            </span>
            <span class="font-semibold text-gray-900 dark:text-slate-200">
              {{ compliancePreview.implementation.implementationPercent }}%
            </span>
          </div>
          <div
            class="flex h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-slate-700"
          >
            <div
              class="bg-blue-600"
              :style="{
                width: `${compliancePreview.implementation.implementationPercent}%`,
              }"
            ></div>
          </div>
          <div class="mt-2 text-xs text-gray-600 dark:text-slate-400">
            {{ compliancePreview.implementation.implementedControls }}
            implemented,
            {{ compliancePreview.implementation.unimplementedControls }} not
            implemented
          </div>
        </div>
      </template>

      <div v-else class="text-sm text-gray-500 dark:text-slate-400">
        Select a profile to view compliance posture.
      </div>
    </div>

    <!-- System Characteristics Summary -->
    <template v-if="systemCharacteristics">
      <!--      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-300">-->
      <!--        System Characteristics Summary-->
      <!--      </h3>-->

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div v-if="systemCharacteristics.systemName">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >System Name</label
          >
          <p class="text-gray-900 dark:text-slate-300">
            {{ systemCharacteristics.systemName }}
          </p>
        </div>

        <div v-if="systemCharacteristics.systemNameShort">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >System Name (Short)</label
          >
          <p class="text-gray-900 dark:text-slate-300">
            {{ systemCharacteristics.systemNameShort }}
          </p>
        </div>

        <div v-if="systemCharacteristics.securitySensitivityLevel">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >Security Sensitivity Level</label
          >
          <p class="text-gray-900 dark:text-slate-300">
            {{ systemCharacteristics.securitySensitivityLevel }}
          </p>
        </div>

        <div v-if="systemCharacteristics.dateAuthorized">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >Date Authorized</label
          >
          <p class="text-gray-900 dark:text-slate-300">
            {{ formatDate(systemCharacteristics.dateAuthorized.toString()) }}
          </p>
        </div>

        <div v-if="systemSecurityPlan.metadata.remarks" class="md:col-span-2">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >Remarks</label
          >
          <p class="text-gray-900 dark:text-slate-300">
            {{ systemSecurityPlan.metadata.remarks }}
          </p>
        </div>

        <div v-if="systemCharacteristics.description" class="md:col-span-2">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >Description</label
          >
          <p class="text-gray-900 dark:text-slate-300">
            {{ systemCharacteristics.description }}
          </p>
        </div>
      </div>
    </template>

    <Diagrams></Diagrams>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type {
  SystemSecurityPlan,
  SystemCharacteristics,
  SystemUser,
  SystemComponent,
  InventoryItem,
  LeveragedAuthorization,
} from '@/oscal';
import type { Profile } from '@/oscal';
import Select from '@/volt/Select.vue';
import { useSystemStore } from '@/stores/system.ts';
import Diagrams from './DiagramsView.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';
import type {
  ProfileComplianceProgress,
  ProfileComplianceSummary,
} from '@/types/compliance';

const toast = useToast();
const { system } = useSystemStore();
const systemSecurityPlan = ref<SystemSecurityPlan>({} as SystemSecurityPlan);
const systemImplementationStats = ref({
  users: 0,
  components: 0,
  inventoryItems: 0,
  leveragedAuthorizations: 0,
});

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

const { execute: executeAttachedProfile } = useDataApi<Profile>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/profile`,
  {
    method: 'GET',
  },
  { immediate: false },
);

const { execute: attachProfile } = useDataApi<void>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/profile`,
  {
    method: 'PUT',
  },
  { immediate: false },
);

const { execute: executeSIUsers } = useDataApi<SystemUser[]>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/system-implementation/users`,
  {
    method: 'GET',
  },
  { immediate: false },
);
const { execute: executeSIComponents } = useDataApi<SystemComponent[]>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/system-implementation/components`,
  {
    method: 'GET',
  },
  { immediate: false },
);
const { execute: executeSIInventory } = useDataApi<InventoryItem[]>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/system-implementation/inventory-items`,
  {
    method: 'GET',
  },
  { immediate: false },
);
const { execute: executeSILeveragedAuths } = useDataApi<
  LeveragedAuthorization[]
>(
  `/api/oscal/system-security-plans/${system.securityPlan?.uuid}/system-implementation/leveraged-authorizations`,
  {
    method: 'GET',
  },
  { immediate: false },
);

const selectedProfile = ref<{ name: string; value: string } | null>(null);
const compliancePreview = ref<ProfileComplianceProgress | null>(null);
const loadingCompliancePreview = ref(false);

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

onMounted(async () => {
  try {
    // Load basic SSP data
    systemSecurityPlan.value = system.securityPlan as SystemSecurityPlan;

    try {
      const { data } = await executeAttachedProfile();
      if (data.value) {
        selectedProfile.value = {
          name: data.value.data.metadata.title,
          value: data.value.data.uuid,
        };
      }
    } catch (error) {
      const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
      if (errorResponse.response?.status !== 404) {
        // 404s are fine, just means no profile is attached
        toast.add({
          severity: 'error',
          summary: 'Error Loading Profile',
          detail:
            errorResponse.response?.data.errors.body ||
            'An error occurred while loading the profile.',
          life: 3000,
        });
      }
    }

    await loadCompliancePreview(selectedProfile.value?.value);

    watch(selectedProfile, async () => {
      try {
        await attachProfile({
          data: {
            profileId: selectedProfile.value?.value,
          },
        });
        toast.add({
          severity: 'success',
          summary: 'Profile updated',
          life: 3000,
        });
        await loadCompliancePreview(selectedProfile.value?.value);
      } catch (error) {
        const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
        toast.add({
          severity: 'error',
          summary: 'Failed to set profile',
          detail: `Received error status from API. Status: ${errorResponse.status}`,
          life: 3000,
        });
      }
    });

    // Load system implementation statistics
    try {
      const [
        usersResponse,
        componentsResponse,
        inventoryResponse,
        leveragedAuthsResponse,
      ] = await Promise.allSettled([
        executeSIUsers(),
        executeSIComponents(),
        executeSIInventory(),
        executeSILeveragedAuths(),
      ]);

      systemImplementationStats.value = {
        users:
          usersResponse.status === 'fulfilled'
            ? (usersResponse.value.data.value?.data.length ?? 0)
            : 0,
        components:
          componentsResponse.status === 'fulfilled'
            ? (componentsResponse.value.data.value?.data.length ?? 0)
            : 0,
        inventoryItems:
          inventoryResponse.status === 'fulfilled'
            ? (inventoryResponse.value.data.value?.data.length ?? 0)
            : 0,
        leveragedAuthorizations:
          leveragedAuthsResponse.status === 'fulfilled'
            ? (leveragedAuthsResponse.value.data.value?.data.length ?? 0)
            : 0,
      };
    } catch (error) {
      console.warn(
        'Could not load some system implementation statistics:',
        error,
      );
    }
  } catch (error) {
    console.error('Error loading System Security Plan overview:', error);
  }
});

function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function satisfiedWidth(summary: ProfileComplianceSummary): number {
  return pct(summary.satisfied, summary.totalControls);
}

function notSatisfiedWidth(summary: ProfileComplianceSummary): number {
  const sat = satisfiedWidth(summary);
  const notSat = pct(summary.notSatisfied, summary.totalControls);
  const remaining = 100 - sat;
  return Math.min(notSat, remaining);
}

function unknownWidth(summary: ProfileComplianceSummary): number {
  const sat = satisfiedWidth(summary);
  const notSat = notSatisfiedWidth(summary);
  const used = Math.min(sat + notSat, 100);
  return 100 - used;
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}
</script>
