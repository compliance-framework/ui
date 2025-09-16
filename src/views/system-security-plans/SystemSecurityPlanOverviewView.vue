<template>
  <template v-if="systemSecurityPlan">
    <div class="space-y-6">
      <!-- Metadata Section -->
      <div
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
      >
        <h3
          class="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-300"
        >
          System Security Plan Metadata
        </h3>

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

          <div v-if="systemSecurityPlan.metadata.remarks" class="md:col-span-2">
            <label
              class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
              >Remarks</label
            >
            <p class="text-gray-900 dark:text-slate-300">
              {{ systemSecurityPlan.metadata.remarks }}
            </p>
          </div>
        </div>

        <div v-else class="text-center py-4">
          <p class="text-gray-500 dark:text-slate-400">Loading metadata...</p>
        </div>
      </div>

      <!-- Actions Section -->
      <div
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
      >
        <h3
          class="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-300"
        >
          Actions
        </h3>

        <div class="flex flex-wrap gap-3">
          <button
            @click="editMetadata"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Edit Metadata
          </button>
          <button
            @click="editSystemCharacteristics"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Edit System Characteristics
          </button>
          <button
            @click="editImplementation"
            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Edit Implementation
          </button>
          <button
            @click="editControls"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Edit Controls
          </button>
          <button
            @click="downloadJson"
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
          >
            Download JSON
          </button>
        </div>

        <!-- Feature Notice -->
        <div
          class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md"
        >
          <p class="text-sm text-green-800 dark:text-green-200">
            <strong>Edit Mode:</strong> Edit buttons are now enabled. Some
            editing functionality is still in development. You can view all SSP
            data and download the full JSON representation.
          </p>
        </div>
      </div>

      <!-- Summary Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {{ statistics.systemUsers }}
          </div>
          <div class="text-sm text-blue-600 dark:text-blue-400">
            System Users
          </div>
        </div>
        <div
          class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800"
        >
          <div class="text-2xl font-bold text-green-600 dark:text-green-400">
            {{ statistics.systemComponents }}
          </div>
          <div class="text-sm text-green-600 dark:text-green-400">
            Components
          </div>
        </div>
        <div
          class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800"
        >
          <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {{ statistics.inventoryItems }}
          </div>
          <div class="text-sm text-purple-600 dark:text-purple-400">
            Inventory Items
          </div>
        </div>
        <div
          class="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800"
        >
          <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {{ statistics.leveragedAuthorizations }}
          </div>
          <div class="text-sm text-orange-600 dark:text-orange-400">
            Leveraged Authorizations
          </div>
        </div>
      </div>

      <!-- System Characteristics Summary -->
      <div
        v-if="systemCharacteristics"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
      >
        <h3
          class="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-300"
        >
          System Characteristics Summary
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type {
  SystemSecurityPlan,
  SystemCharacteristics,
  SystemUser,
  SystemComponent,
  LeveragedAuthorization,
} from '@/oscal';
import type { InventoryItem, Profile } from '@/oscal';
import Select from '@/volt/Select.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types.ts';
import decamelizeKeys from 'decamelize-keys';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const systemImplementationStats = ref({
  users: 0,
  components: 0,
  inventoryItems: 0,
  leveragedAuthorizations: 0,
});

const statistics = computed(() => ({
  systemUsers: systemImplementationStats.value.users,
  systemComponents: systemImplementationStats.value.components,
  inventoryItems: systemImplementationStats.value.inventoryItems,
  leveragedAuthorizations:
    systemImplementationStats.value.leveragedAuthorizations,
}));

const { data: systemSecurityPlan } = useDataApi<SystemSecurityPlan>(
  `/api/oscal/system-security-plans/${route.params.id}`,
);

const { data: systemCharacteristics } = useDataApi<SystemCharacteristics>(
  `/api/oscal/system-security-plans/${route.params.id}/system-characteristics`,
);

const { execute: executeAttachedProfile } = useDataApi<Profile>(
  `/api/oscal/system-security-plans/${route.params.id}/profile`,
  {
    method: 'GET',
  },
  { immediate: false },
);
const { execute: attachProfile } = useDataApi<void>(
  `/api/oscal/system-security-plans/${route.params.id}/profile`,
  {
    method: 'PUT',
  },
  { immediate: false },
);
const { execute: executeSIUsers } = useDataApi<SystemUser[]>(
  `/api/oscal/system-security-plans/${route.params.id}/system-implementation/users`,
  {
    method: 'GET',
  },
  { immediate: false },
);
const { execute: executeSIComponents } = useDataApi<SystemComponent[]>(
  `/api/oscal/system-security-plans/${route.params.id}/system-implementation/components`,
  {
    method: 'GET',
  },
  { immediate: false },
);
const { execute: executeSIInventory } = useDataApi<InventoryItem[]>(
  `/api/oscal/system-security-plans/${route.params.id}/system-implementation/inventory-items`,
  {
    method: 'GET',
  },
  { immediate: false },
);
const { execute: executeSILeveragedAuths } = useDataApi<
  LeveragedAuthorization[]
>(
  `/api/oscal/system-security-plans/${route.params.id}/system-implementation/leveraged-authorizations`,
  {
    method: 'GET',
  },
  { immediate: false },
);
const { execute: executeDownloadJSON } = useDataApi(
  `/api/oscal/system-security-plans/${route.params.id}/full`,
  {
    method: 'GET',
  },
  { immediate: false },
);

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

const selectedProfile = ref<{ name: string; value: string }>({
  name: '',
  value: '',
});

onMounted(async () => {
  try {
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

function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}

async function downloadJson(): Promise<void> {
  if (!systemSecurityPlan.value) return;
  try {
    // Get raw API response without camelCase conversion
    const { data } = await executeDownloadJSON();

    const dataStr = JSON.stringify(
      decamelizeKeys(data.value!, { separator: '-', deep: true }),
      null,
      2,
    );
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ssp-${systemSecurityPlan.value.uuid}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    const errorResponse = err as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: `Failed to download SSP JSON: ${errorResponse.response?.status}`,
      life: 3000,
    });
  }
}

// Placeholder functions for editing functionality
const editMetadata = () => {
  // Navigate to the SSP editor view
  router.push(`/system-security-plans/${systemSecurityPlan.value!.uuid}`);
};

const editSystemCharacteristics = () => {
  router.push(
    `/system-security-plans/${systemSecurityPlan.value!.uuid}/system-characteristics`,
  );
};

const editImplementation = () => {
  router.push(
    `/system-security-plans/${systemSecurityPlan.value!.uuid}/system-implementation`,
  );
};

const editControls = () => {
  router.push(
    `/system-security-plans/${systemSecurityPlan.value!.uuid}/control-implementation`,
  );
};
</script>
