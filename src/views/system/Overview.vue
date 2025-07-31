<template>
<!--    <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-300">-->
<!--      System Security Plan-->
<!--    </h3>-->
  <div class="p-4">
    <!-- Edit/Save buttons -->
    <div class="flex justify-end mb-4 gap-2" v-if="systemSecurityPlan?.uuid">
      <button
        v-if="!isEditing"
        @click="startEditing"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Edit
      </button>
      <button
        v-if="isEditing"
        @click="saveChanges"
        :disabled="saving"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
      >
        {{ saving ? 'Saving...' : 'Save' }}
      </button>
      <button
        v-if="isEditing"
        @click="cancelEditing"
        :disabled="saving"
        class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
    <div v-if="!systemSecurityPlan?.uuid" class="text-gray-500 dark:text-slate-400 text-center py-8">
      No system security plan data available.
    </div>
    <div
      v-else-if="systemSecurityPlan.metadata"
      class="grid grid-cols-1 md:grid-cols-2 gap-6"
    >
      <div>
        <label
          class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
          >Title</label
        >
        <input
          v-if="isEditing"
          v-model="editableData.metadata.title"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300"
        />
        <p v-else class="text-gray-900 dark:text-slate-300">
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
        <input
          v-if="isEditing"
          v-model="editableData.metadata.version"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300"
        />
        <p v-else class="text-gray-900 dark:text-slate-300">
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



    <!-- System Characteristics Summary -->
    <template
      v-if="systemCharacteristics"
    >
<!--      <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-300">-->
<!--        System Characteristics Summary-->
<!--      </h3>-->

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div v-if="systemCharacteristics.systemName">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >System Name</label
          >
          <input
            v-if="isEditing"
            v-model="editableData.systemCharacteristics.systemName"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300"
          />
          <p v-else class="text-gray-900 dark:text-slate-300">
            {{ systemCharacteristics.systemName }}
          </p>
        </div>

        <div v-if="systemCharacteristics.systemNameShort">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >System Name (Short)</label
          >
          <input
            v-if="isEditing"
            v-model="editableData.systemCharacteristics.systemNameShort"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300"
          />
          <p v-else class="text-gray-900 dark:text-slate-300">
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
          <textarea
            v-if="isEditing"
            v-model="editableData.metadata.remarks"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300"
          />
          <p v-else class="text-gray-900 dark:text-slate-300">
            {{ systemSecurityPlan.metadata.remarks }}
          </p>
        </div>

        <div v-if="systemCharacteristics.description" class="md:col-span-2">
          <label
            class="block text-sm font-medium text-gray-700 dark:text-slate-400 mb-1"
            >Description</label
          >
          <textarea
            v-if="isEditing"
            v-model="editableData.systemCharacteristics.description"
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300"
          />
          <p v-else class="text-gray-900 dark:text-slate-300">
            {{ systemCharacteristics.description }}
          </p>
        </div>
      </div>
    </template>

    <Diagrams></Diagrams>
  </div>

</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  type SystemSecurityPlan,
  type SystemCharacteristics,
  useSystemSecurityPlanStore,
} from '@/stores/system-security-plans.ts';
import { useConfigStore } from '@/stores/config.ts';
import { type DataResponse, useApi, useFetch } from '@/composables/api';
import type { Profile } from '@/oscal';
import { useMustAuthenticate } from '@/composables/useMustAuthenticate';
import Select from '@/volt/Select.vue';
import { useSystemStore } from '@/stores/system.ts';
import Diagrams from './Diagrams.vue'
import { useToast } from 'primevue/usetoast'

const route = useRoute();
const router = useRouter();
const toast = useToast();
const systemStore = useSystemStore();
const { system } = systemStore;
const sspStore = useSystemSecurityPlanStore();
const configStore = useConfigStore();
const { watchForUnauthenticated } = useMustAuthenticate();

const systemSecurityPlan = ref<SystemSecurityPlan>({} as SystemSecurityPlan);
const systemCharacteristics = ref<SystemCharacteristics | null>(null);
const systemImplementationStats = ref({
  users: 0,
  components: 0,
  inventoryItems: 0,
  leveragedAuthorizations: 0,
});

// Edit mode state
const isEditing = ref(false);
const saving = ref(false);
const editableData = ref({
  metadata: {
    title: '',
    version: '',
    remarks: ''
  },
  systemCharacteristics: {
    systemName: '',
    systemNameShort: '',
    description: ''
  }
});

const statistics = computed(() => ({
  systemUsers: systemImplementationStats.value.users,
  systemComponents: systemImplementationStats.value.components,
  inventoryItems: systemImplementationStats.value.inventoryItems,
  leveragedAuthorizations:
    systemImplementationStats.value.leveragedAuthorizations,
}));

const profileItems = ref<Array<{ name: string; value: string }>>([]);
const {
  data: profiles,
  loading: loadingProfiles,
  response: profileListResponse,
} = useApi<DataResponse<Profile[]>>(new Request('/api/oscal/profiles'));
watchForUnauthenticated(profileListResponse);
watch(profiles, () => {
  profileItems.value =
    profiles.value?.data.map((item) => {
      return {
        name: item.metadata.title,
        value: item.uuid,
      };
    }) || [];
});

const selectedProfile = ref();

onMounted(async () => {
  try {
    // Load basic SSP data
    if (!system.securityPlan?.uuid) {
      return;
    }
    
    systemSecurityPlan.value = system.securityPlan as SystemSecurityPlan;

    useFetch(
      new Request(
        `/api/oscal/system-security-plans/${systemSecurityPlan.value.uuid}/profile`,
      ),
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((res: DataResponse<Profile>) => {
        if (res.data) {
          selectedProfile.value = {
            name: res.data.metadata.title,
            value: res.data.uuid,
          };
        }
      })
      .catch((error: Response) => {
        // 404 is fine. The rest, throw.
        if (error.status !== 404) {
          return error;
        }
      })
      .finally(() => {
        watch(selectedProfile, async () => {
          sspStore.attachProfile(systemSecurityPlan.value.uuid, selectedProfile.value.value)
            .then(() => {
              toast.add({
                severity: 'success',
                summary: 'Profile updated',
                life: 3000
              })
            })
            .catch((error: Response) => {
              toast.add({
                severity: 'error',
                summary: 'Failed to set profile',
                detail: `Received error status from API. Status: ${error.status}`,
                life: 3000
              })
            });
        });
      });

    // Load system characteristics
    try {
      const characteristicsResponse = await sspStore.getCharacteristics(systemSecurityPlan.value.uuid);
      systemCharacteristics.value = characteristicsResponse.data;
    } catch (error) {
      console.warn('Could not load system characteristics:', error);
    }

    // Load system implementation statistics
    try {
      const [
        usersResponse,
        componentsResponse,
        inventoryResponse,
        leveragedAuthsResponse,
      ] = await Promise.allSettled([
        sspStore.getSystemImplementationUsers(systemSecurityPlan.value.uuid),
        sspStore.getSystemImplementationComponents(systemSecurityPlan.value.uuid),
        sspStore.getSystemImplementationInventoryItems(systemSecurityPlan.value.uuid),
        sspStore.getSystemImplementationLeveragedAuthorizations(systemSecurityPlan.value.uuid),
      ]);

      systemImplementationStats.value = {
        users:
          usersResponse.status === 'fulfilled'
            ? usersResponse.value.data.length
            : 0,
        components:
          componentsResponse.status === 'fulfilled'
            ? componentsResponse.value.data.length
            : 0,
        inventoryItems:
          inventoryResponse.status === 'fulfilled'
            ? inventoryResponse.value.data.length
            : 0,
        leveragedAuthorizations:
          leveragedAuthsResponse.status === 'fulfilled'
            ? leveragedAuthsResponse.value.data.length
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

// Edit mode functions
function startEditing() {
  // Copy current data to editable state
  editableData.value = {
    metadata: {
      title: systemSecurityPlan.value.metadata?.title || '',
      version: systemSecurityPlan.value.metadata?.version || '',
      remarks: systemSecurityPlan.value.metadata?.remarks || ''
    },
    systemCharacteristics: {
      systemName: systemCharacteristics.value?.systemName || '',
      systemNameShort: systemCharacteristics.value?.systemNameShort || '',
      description: systemCharacteristics.value?.description || ''
    }
  };
  isEditing.value = true;
}

function cancelEditing() {
  isEditing.value = false;
  // Reset editable data
  editableData.value = {
    metadata: {
      title: '',
      version: '',
      remarks: ''
    },
    systemCharacteristics: {
      systemName: '',
      systemNameShort: '',
      description: ''
    }
  };
}

async function saveChanges() {
  saving.value = true;
  
  try {
    // Update metadata
    const metadataUpdate = {
      title: editableData.value.metadata.title,
      version: editableData.value.metadata.version,
      remarks: editableData.value.metadata.remarks
    };
    
    // Update system characteristics
    const characteristicsUpdate = {
      ...systemCharacteristics.value,
      systemName: editableData.value.systemCharacteristics.systemName,
      systemNameShort: editableData.value.systemCharacteristics.systemNameShort,
      description: editableData.value.systemCharacteristics.description
    } as SystemCharacteristics;
    
    // Call APIs to update both metadata and characteristics
    const [metadataResponse, characteristicsResponse] = await Promise.all([
      sspStore.updateMetadata(systemSecurityPlan.value.uuid, metadataUpdate),
      sspStore.updateCharacteristics(systemSecurityPlan.value.uuid, characteristicsUpdate)
    ]);
    
    // Update local state with responses
    systemSecurityPlan.value.metadata = {
      ...systemSecurityPlan.value.metadata,
      ...metadataResponse.data
    };
    systemCharacteristics.value = characteristicsResponse.data;
    
    // Update the system store to reflect changes
    systemStore.setSecurityPlan({
      ...systemSecurityPlan.value,
      metadata: systemSecurityPlan.value.metadata
    });
    
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'System Security Plan updated successfully',
      life: 3000
    });
    
    isEditing.value = false;
  } catch (error) {
    console.error('Error saving changes:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save changes',
      life: 3000
    });
  } finally {
    saving.value = false;
  }
}

async function downloadJson(): Promise<void> {
  try {
    // Get raw API response without camelCase conversion
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/oscal/system-security-plans/${route.params.id}/full`,
      {
        credentials: 'include',
      },
    );
    if (!response.ok) {
      throw response;
    }
    const data = await response.json();

    const dataStr = JSON.stringify(data, null, 2);
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
    console.error('Error downloading JSON:', err);
  }
}

// Placeholder functions for editing functionality
const editMetadata = () => {
  // Navigate to the SSP editor view
  router.push(`/system-security-plans/${systemSecurityPlan.value.uuid}`);
};

const editSystemCharacteristics = () => {
  router.push(
    `/system-security-plans/${systemSecurityPlan.value.uuid}/system-characteristics`,
  );
};

const editImplementation = () => {
  router.push(
    `/system-security-plans/${systemSecurityPlan.value.uuid}/system-implementation`,
  );
};

const editControls = () => {
  router.push(
    `/system-security-plans/${systemSecurityPlan.value.uuid}/control-implementation`,
  );
};
</script>
