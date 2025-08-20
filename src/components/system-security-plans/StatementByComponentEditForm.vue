<template>
  <div class="px-12 py-8">
    <form @submit.prevent="updateByComponent()">

      <!-- Component UUID (Read-only) -->
      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Component UUID</label>
        <div class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md">
          <span class="text-gray-600 dark:text-slate-400 font-mono">{{ byComponentData.componentUuid }}</span>
        </div>
      </div>

      <!-- UUID (Read-only) -->
      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
        <div class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md">
          <span class="text-gray-600 dark:text-slate-400 font-mono">{{ byComponentData.uuid }}</span>
        </div>
      </div>

      <!-- Description -->
      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Description <span class="text-red-500">*</span></label>
        <FormTextarea v-model="byComponentData.description" required rows="4" />
      </div>

      <!-- Implementation Status -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Implementation Status</label>
        <div class="p-4 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800">
          <div class="mb-3">
            <label class="inline-block pb-1 text-sm dark:text-slate-300">State</label>
            <select
              v-model="byComponentData.implementationStatus!.state"
              class="w-full p-2 border border-ccf-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="">Select status</option>
              <option value="implemented">Implemented</option>
              <option value="partial">Partial</option>
              <option value="planned">Planned</option>
              <option value="alternative">Alternative</option>
              <option value="not-applicable">Not Applicable</option>
            </select>
          </div>

          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300">Remarks</label>
            <FormTextarea v-model="byComponentData.implementationStatus!.remarks" rows="2" />
          </div>
        </div>
      </div>

      <!-- Export -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Export</label>
        <div class="p-4 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800">

          <!-- Provided -->
          <div class="mb-4">
            <h4 class="text-sm font-medium dark:text-slate-300 mb-2">Provided</h4>
            <div class="space-y-2">
              <div
                v-for="(provided, index) in byComponentData.export?.provided || []"
                :key="provided.uuid"
                class="p-3 border border-ccf-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
              >
                <div class="flex justify-between items-start mb-2">
                  <span class="text-xs text-gray-500 dark:text-slate-400">UUID: {{ provided.uuid }}</span>
                  <button
                    type="button"
                    @click="removeProvided(index)"
                    class="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <FormTextarea v-model="provided.description" placeholder="Description of what is provided" rows="2" />
              </div>
              <button
                type="button"
                @click="addProvided"
                class="text-sm px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
              >
                Add Provided
              </button>
            </div>
          </div>

          <!-- Responsibilities -->
          <div>
            <h4 class="text-sm font-medium dark:text-slate-300 mb-2">Responsibilities</h4>
            <div class="space-y-2">
              <div
                v-for="(responsibility, index) in byComponentData.export?.responsibilities || []"
                :key="responsibility.uuid"
                class="p-3 border border-ccf-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900"
              >
                <div class="flex justify-between items-start mb-2">
                  <span class="text-xs text-gray-500 dark:text-slate-400">UUID: {{ responsibility.uuid }}</span>
                  <button
                    type="button"
                    @click="removeResponsibility(index)"
                    class="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <FormTextarea v-model="responsibility.description" placeholder="Description of responsibility" rows="2" />
              </div>
              <button
                type="button"
                @click="addResponsibility"
                class="text-sm px-3 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors"
              >
                Add Responsibility
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Inherited -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Inherited</label>
        <div class="space-y-2">
          <div
            v-for="(inherited, index) in byComponentData.inherited"
            :key="inherited.uuid"
            class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
          >
            <div class="flex justify-between items-start mb-2">
              <span class="text-xs text-gray-500 dark:text-slate-400">UUID: {{ inherited.uuid }}</span>
              <button
                type="button"
                @click="removeInherited(index)"
                class="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
            <FormTextarea v-model="inherited.description" placeholder="Description of inherited control" rows="2" />
          </div>
          <button
            type="button"
            @click="addInherited"
            class="text-sm px-3 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors"
          >
            Add Inherited
          </button>
        </div>
      </div>

      <!-- Satisfied -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Satisfied</label>
        <div class="space-y-2">
          <div
            v-for="(satisfied, index) in byComponentData.satisfied"
            :key="satisfied.uuid"
            class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
          >
            <div class="flex justify-between items-start mb-2">
              <span class="text-xs text-gray-500 dark:text-slate-400">UUID: {{ satisfied.uuid }}</span>
              <button
                type="button"
                @click="removeSatisfied(index)"
                class="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
            <FormTextarea v-model="satisfied.description" placeholder="Description of satisfied requirement" rows="2" />
          </div>
          <button
            type="button"
            @click="addSatisfied"
            class="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
          >
            Add Satisfied
          </button>
        </div>
      </div>

      <!-- Set Parameters -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Set Parameters</label>
        <div class="space-y-2">
          <div
            v-for="(param, index) in byComponentData.setParameters"
            :key="index"
            class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
          >
            <div class="flex justify-between items-start mb-2">
              <h4 class="text-sm font-medium dark:text-slate-300">Parameter {{ index + 1 }}</h4>
              <button
                type="button"
                @click="removeParameter(index)"
                class="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="inline-block pb-1 text-sm dark:text-slate-300">Parameter ID</label>
                <FormInput v-model="param.paramId" placeholder="e.g., ac-1_prm_1" />
              </div>
              <div>
                <label class="inline-block pb-1 text-sm dark:text-slate-300">Value</label>
                <FormInput v-model="param.values[0]" placeholder="Parameter value" />
              </div>
            </div>
          </div>
          <button
            type="button"
            @click="addParameter"
            class="text-sm px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
          >
            Add Parameter
          </button>
        </div>
      </div>

      <!-- Responsible Roles -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Responsible Roles</label>
        <div class="space-y-2">
          <div
            v-for="(role, index) in byComponentData.responsibleRoles"
            :key="index"
            class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
          >
            <div class="flex justify-between items-start mb-2">
              <h4 class="text-sm font-medium dark:text-slate-300">Role {{ index + 1 }}</h4>
              <button
                type="button"
                @click="removeRole(index)"
                class="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
            <div class="mb-2">
              <label class="inline-block pb-1 text-sm dark:text-slate-300">Role ID</label>
              <FormInput v-model="role.roleId" placeholder="e.g., system-owner, maintainer" />
            </div>
            <div>
              <label class="inline-block pb-1 text-sm dark:text-slate-300">Party UUIDs (comma-separated)</label>
              <FormInput
                :model-value="role.partyUuids?.join(', ')"
                @update:model-value="updateRolePartyUuids(index, $event)"
                placeholder="Enter UUIDs separated by commas"
              />
            </div>
          </div>
          <button
            type="button"
            @click="addRole"
            class="text-sm px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
          >
            Add Responsible Role
          </button>
        </div>
      </div>

      <!-- Remarks -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
        <FormTextarea v-model="byComponentData.remarks" rows="3" />
      </div>

      <!-- Form Actions -->
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
          {{ saving ? 'Saving...' : 'Save By-Component' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import type {
  ByComponent,
  Statement,
  ImplementedRequirement,
} from '@/stores/system-security-plans.ts';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorBody, ErrorResponse } from '@/stores/types';

const props = defineProps<{
  sspId: string;
  requirement: ImplementedRequirement;
  statement: Statement;
  byComponent: ByComponent;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [byComponent: ByComponent];
}>();

const toast = useToast();
const { data: updatedByComponent, execute: updateByComponentApi, isLoading: saving } = useDataApi<ByComponent>(
  `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${props.requirement.uuid}/statements/${props.statement.uuid}/by-components/${props.byComponent.uuid}`,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys]
  }, { immediate: false }
);

const byComponentData = reactive<ByComponent>({
  uuid: '',
  componentUuid: '',
  description: '',
  props: [],
  links: [],
  setParameters: [],
  responsibleRoles: [],
  remarks: '',
  implementationStatus: {
    state: '',
    remarks: ''
  },
  export: undefined,
  inherited: [],
  satisfied: []
});

onMounted(() => {
  // Deep copy the by-component data
  Object.assign(byComponentData, {
    ...props.byComponent,
    implementationStatus: props.byComponent.implementationStatus || { state: '', remarks: '' },
    export: props.byComponent.export ? {
      ...props.byComponent.export,
      provided: [...(props.byComponent.export.provided || [])],
      responsibilities: [...(props.byComponent.export.responsibilities || [])]
    } : undefined,
    inherited: [...(props.byComponent.inherited || [])],
    satisfied: [...(props.byComponent.satisfied || [])],
    setParameters: [...(props.byComponent.setParameters || [])],
    responsibleRoles: [...(props.byComponent.responsibleRoles || [])]
  });
});

// Export functions
const addProvided = () => {
  if (!byComponentData.export) {
    byComponentData.export = {
      uuid: crypto.randomUUID(),
      description: '',
      props: [],
      links: [],
      provided: [],
      responsibilities: []
    };
  }
  if (!byComponentData.export.provided) {
    byComponentData.export.provided = [];
  }
  byComponentData.export.provided.push({
    uuid: crypto.randomUUID(),
    description: '',
    props: [],
    links: []
  });
};

const removeProvided = (index: number) => {
  byComponentData.export?.provided?.splice(index, 1);
};

const addResponsibility = () => {
  if (!byComponentData.export) {
    byComponentData.export = {
      uuid: crypto.randomUUID(),
      description: '',
      props: [],
      links: [],
      provided: [],
      responsibilities: []
    };
  }
  if (!byComponentData.export.responsibilities) {
    byComponentData.export.responsibilities = [];
  }
  byComponentData.export.responsibilities.push({
    uuid: crypto.randomUUID(),
    description: '',
    props: [],
    links: []
  });
};

const removeResponsibility = (index: number) => {
  byComponentData.export?.responsibilities?.splice(index, 1);
};

// Inherited functions
const addInherited = () => {
  if (!byComponentData.inherited) {
    byComponentData.inherited = [];
  }
  byComponentData.inherited.push({
    uuid: crypto.randomUUID(),
    providedUuid: '',
    description: '',
    props: [],
    links: []
  });
};

const removeInherited = (index: number) => {
  byComponentData.inherited?.splice(index, 1);
};

// Satisfied functions
const addSatisfied = () => {
  if (!byComponentData.satisfied) {
    byComponentData.satisfied = [];
  }
  byComponentData.satisfied.push({
    uuid: crypto.randomUUID(),
    responsibilityUuid: '',
    description: '',
    props: [],
    links: []
  });
};

const removeSatisfied = (index: number) => {
  byComponentData.satisfied?.splice(index, 1);
};

// Parameter functions
const addParameter = () => {
  if (!byComponentData.setParameters) {
    byComponentData.setParameters = [];
  }
  byComponentData.setParameters.push({
    paramId: '',
    values: [''],
    props: [],
    links: []
  });
};

const removeParameter = (index: number) => {
  byComponentData.setParameters?.splice(index, 1);
};

// Role functions
const addRole = () => {
  if (!byComponentData.responsibleRoles) {
    byComponentData.responsibleRoles = [];
  }
  byComponentData.responsibleRoles.push({
    roleId: '',
    partyUuids: [],
    props: [],
    links: []
  });
};

const removeRole = (index: number) => {
  byComponentData.responsibleRoles?.splice(index, 1);
};

const updateRolePartyUuids = (index: number, value: string) => {
  if (byComponentData.responsibleRoles && byComponentData.responsibleRoles[index]) {
    byComponentData.responsibleRoles[index].partyUuids = value
      .split(',')
      .map(uuid => uuid.trim())
      .filter(uuid => uuid.length > 0);
  }
};

const updateByComponent = async () => {
  if (!byComponentData.description.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Description is required.',
      life: 3000
    });
    return;
  }

  try {
    await updateByComponentApi({
      data: byComponentData
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'By-Component updated successfully.',
      life: 3000
    });

    emit('saved', updatedByComponent.value!);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    const errorMessage = errorResponse.response?.data?.errors.body || 'An unexpected error occurred.';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 5000
    });
  }
};
</script>
