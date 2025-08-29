<template>
  <div class="px-12 py-8">
    <form @submit.prevent="createInventoryItem()">
      <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">
        Create Inventory Item
      </h1>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Destination <span class="text-red-500">*</span></label
        >
        <div class="flex gap-2">
          <select
            v-model="destination"
            @change="onDestinationChange"
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
            required
          >
            <option value="unattached">
              Unattached (Can be attached later)
            </option>
            <option value="ssp">System Security Plan (Production)</option>
            <option value="poam">Plan of Action & Milestones (Planned)</option>
            <option value="assessment-plan">Assessment Plan (Discovery)</option>
            <option value="assessment-results">
              Assessment Results (Findings)
            </option>
          </select>
        </div>
        <p
          v-if="destination === 'unattached'"
          class="text-sm text-gray-500 dark:text-gray-400 mt-1"
        >
          Item will be created without attachment. You can attach it to an SSP
          or POAM later.
        </p>
        <p
          v-else-if="destination === 'ssp'"
          class="text-sm text-gray-500 dark:text-gray-400 mt-1"
        >
          Item will be immediately added to the active SSP as operational
          inventory.
        </p>
        <p
          v-else-if="destination === 'poam'"
          class="text-sm text-gray-500 dark:text-gray-400 mt-1"
        >
          Item will be tracked as planned inventory for future implementation.
        </p>
        <p
          v-else-if="destination === 'assessment-plan'"
          class="text-sm text-gray-500 dark:text-gray-400 mt-1"
        >
          Item will be documented as part of assessment planning.
        </p>
        <p
          v-else-if="destination === 'assessment-results'"
          class="text-sm text-gray-500 dark:text-gray-400 mt-1"
        >
          Item will be recorded as discovered during assessment.
        </p>
      </div>

      <div v-if="destination === 'ssp' && !props.sspId" class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Select SSP</label>
        <select
          v-model="selectedSspId"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
          required
        >
          <option value="">Select an SSP...</option>
          <option
            v-for="ssp in availableSSPs"
            :key="ssp.uuid"
            :value="ssp.uuid"
          >
            {{ ssp.metadata?.title || 'Untitled SSP' }}
          </option>
        </select>
      </div>

      <div v-if="destination === 'poam'" class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Select POAM (Optional)</label
        >
        <select
          v-model="selectedPoamId"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
        >
          <option value="">No specific POAM...</option>
          <option
            v-for="poam in availablePOAMs"
            :key="poam.uuid"
            :value="poam.uuid"
          >
            {{ poam.metadata?.title || 'Untitled POAM' }}
          </option>
        </select>
      </div>

      <div v-if="destination === 'assessment-plan'" class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Select Assessment Plan (Optional)</label
        >
        <select
          v-model="selectedAssessmentPlanId"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
        >
          <option value="">No specific Assessment Plan...</option>
          <option
            v-for="ap in availableAssessmentPlans"
            :key="ap.uuid"
            :value="ap.uuid"
          >
            {{ ap.metadata?.title || 'Untitled Assessment Plan' }}
          </option>
        </select>
      </div>

      <div v-if="destination === 'assessment-results'" class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Select Assessment Results (Optional)</label
        >
        <select
          v-model="selectedAssessmentResultsId"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
        >
          <option value="">No specific Assessment Results...</option>
          <option
            v-for="ar in availableAssessmentResults"
            :key="ar.uuid"
            :value="ar.uuid"
          >
            {{ ar.metadata?.title || 'Untitled Assessment Results' }}
          </option>
        </select>
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
        <div class="flex gap-2">
          <FormInput
            v-model="inventoryItemData.uuid"
            placeholder="Inventory Item UUID"
            class="flex-1"
            readonly
          />
          <button
            type="button"
            @click="generateUUID"
            class="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Generate
          </button>
        </div>
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Description <span class="text-red-500">*</span></label
        >
        <FormTextarea v-model="inventoryItemData.description" required />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Asset Type</label>
        <select
          v-model="assetType"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-300"
        >
          <option value="">None</option>
          <option value="operating-system">Operating System</option>
          <option value="database">Database</option>
          <option value="web-server">Web Server</option>
          <option value="application">Application</option>
          <option value="network-device">Network Device</option>
          <option value="container">Container</option>
          <option value="cloud-service">Cloud Service</option>
        </select>
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
        <FormTextarea v-model="inventoryItemData.remarks" />
      </div>

      <div class="flex justify-end gap-4">
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {{ saving ? 'Creating...' : 'Create Inventory Item' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, watch, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import type { InventoryItem } from '@/stores/system-security-plans.ts';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { v4 as uuidv4 } from 'uuid';

const props = defineProps<{
  sspId?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  created: [inventoryItem: any];
}>();

const toast = useToast();

const destination = ref<
  'unattached' | 'ssp' | 'poam' | 'assessment-plan' | 'assessment-results'
>('unattached');
const selectedSspId = ref('');
const selectedPoamId = ref('');
const selectedAssessmentPlanId = ref('');
const selectedAssessmentResultsId = ref('');
const assetType = ref('');

// Load available SSPs, POAMs, Assessment Plans, and Assessment Results
const { data: sspList } = useDataApi<any[]>('/api/oscal/system-security-plans');
const { data: poamList } = useDataApi<any[]>(
  '/api/oscal/plan-of-action-and-milestones',
);
const { data: assessmentPlanList } = useDataApi<any[]>(
  '/api/oscal/assessment-plans',
);
const { data: assessmentResultsList } = useDataApi<any[]>(
  '/api/oscal/assessment-results',
);

const availableSSPs = computed(() => sspList.value || []);
const availablePOAMs = computed(() => poamList.value || []);
const availableAssessmentPlans = computed(() => assessmentPlanList.value || []);
const availableAssessmentResults = computed(
  () => assessmentResultsList.value || [],
);

const inventoryItemData = reactive<InventoryItem>({
  uuid: '',
  description: '',
  remarks: '',
  props: [],
  links: [],
  responsibleParties: [],
  implementedComponents: [],
});

// Update props when asset type changes
watch(assetType, (newType) => {
  if (newType) {
    // Remove existing asset-type prop
    inventoryItemData.props =
      inventoryItemData.props?.filter((p) => p.name !== 'asset-type') || [];
    // Add new asset-type prop
    inventoryItemData.props.push({
      name: 'asset-type',
      value: newType,
    });
  } else {
    // Remove asset-type prop if cleared
    inventoryItemData.props =
      inventoryItemData.props?.filter((p) => p.name !== 'asset-type') || [];
  }
});

const {
  data: newItem,
  isLoading: saving,
  execute: createItem,
} = useDataApi<any>(
  null,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const generateUUID = () => {
  inventoryItemData.uuid = uuidv4();
};

const getDestinationName = () => {
  switch (destination.value) {
    case 'ssp':
      return 'System Security Plan';
    case 'poam':
      return 'Plan of Action & Milestones';
    case 'assessment-plan':
      return 'Assessment Plan';
    case 'assessment-results':
      return 'Assessment Results';
    default:
      return 'unattached state';
  }
};

const onDestinationChange = () => {
  // Reset selections when destination changes
  selectedSspId.value = '';
  selectedPoamId.value = '';
  selectedAssessmentPlanId.value = '';
  selectedAssessmentResultsId.value = '';

  // If SSP destination and we have a prop SSP ID, use it
  if (destination.value === 'ssp' && props.sspId) {
    selectedSspId.value = props.sspId;
  }
};

const createInventoryItem = async () => {
  try {
    // Determine destination ID
    let destinationId = '';
    if (destination.value === 'ssp') {
      destinationId = props.sspId || selectedSspId.value;
      if (!destinationId) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Please select an SSP',
          life: 3000,
        });
        return;
      }
    } else if (destination.value === 'poam') {
      destinationId = selectedPoamId.value; // Optional for POAM
    } else if (destination.value === 'assessment-plan') {
      destinationId = selectedAssessmentPlanId.value; // Optional for Assessment Plan
    } else if (destination.value === 'assessment-results') {
      destinationId = selectedAssessmentResultsId.value; // Optional for Assessment Results
    }

    // Prepare request
    const request = {
      destination: destination.value,
      destination_id: destinationId,
      inventory_item: inventoryItemData,
    };

    // Create the item using the new endpoint
    // Fix: Pass request as data in config object
    await createItem('/api/oscal/inventory', { data: request });

    if (newItem.value) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: `Inventory item created in ${getDestinationName()}`,
        life: 3000,
      });
      emit('created', newItem.value);
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        error?.response?.data?.message || 'Failed to create inventory item',
      life: 3000,
    });
  }
};

onMounted(() => {
  generateUUID();
  // If we have an SSP ID prop, default to SSP destination
  if (props.sspId) {
    destination.value = 'ssp';
    selectedSspId.value = props.sspId;
  }
});
</script>
