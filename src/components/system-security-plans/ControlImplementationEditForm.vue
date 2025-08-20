<template>
  <div class="px-12 py-8">
    <form @submit.prevent="updateControlImplementation()">
      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
        <div
          class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md"
        >
          <span class="text-gray-600 dark:text-slate-400 font-mono">{{
            controlImplData.uuid
          }}</span>
        </div>
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Source</label>
        <FormInput
          v-model="controlImplData.source"
          placeholder="Source of control implementation"
        />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Description <span class="text-red-500">*</span></label
        >
        <FormTextarea v-model="controlImplData.description" rows="4" required />
      </div>

      <!-- Set Parameters -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Set Parameters</label
        >
        <div class="space-y-4">
          <div
            v-for="(param, index) in controlImplData.setParameters"
            :key="index"
            class="p-4 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
          >
            <div class="flex justify-between items-start mb-3">
              <h4 class="text-sm font-medium dark:text-slate-300">
                Parameter {{ index + 1 }}
              </h4>
              <button
                type="button"
                @click="removeParameter(index)"
                class="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>

            <div class="mb-3">
              <label class="inline-block pb-1 text-sm dark:text-slate-300"
                >Parameter ID</label
              >
              <FormInput
                v-model="param.paramId"
                placeholder="Parameter identifier"
              />
            </div>

            <div class="mb-3">
              <label class="inline-block pb-1 text-sm dark:text-slate-300"
                >Values</label
              >
              <div class="space-y-2">
                <div
                  v-for="(value, valueIndex) in param.values"
                  :key="valueIndex"
                  class="flex gap-2"
                >
                  <FormInput
                    v-model="param.values[valueIndex]"
                    placeholder="Parameter value"
                    class="flex-1"
                  />
                  <button
                    type="button"
                    @click="removeParameterValue(index, valueIndex)"
                    class="px-2 py-1 text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
                <button
                  type="button"
                  @click="addParameterValue(index)"
                  class="text-sm px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Add Value
                </button>
              </div>
            </div>

            <div class="mb-3">
              <label class="inline-block pb-1 text-sm dark:text-slate-300"
                >Remarks</label
              >
              <FormTextarea v-model="param.remarks" rows="2" />
            </div>
          </div>

          <button
            type="button"
            @click="addParameter"
            class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Add Parameter
          </button>
        </div>
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
          {{ saving ? 'Saving...' : 'Save Control Implementation' }}
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
import type { ControlImplementation } from '@/stores/system-security-plans.ts';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorBody, ErrorResponse } from '@/stores/types.ts';

const props = defineProps<{
  sspId: string;
  controlImplementation: ControlImplementation;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [controlImplementation: ControlImplementation];
}>();

const toast = useToast();

const {
  data: updatedCI,
  execute: executeUpdate,
  isLoading: saving,
} = useDataApi<ControlImplementation>(
  `/api/oscal/system-security-plans/${props.sspId}/control-implementation`,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const controlImplData = reactive<ControlImplementation>({
  uuid: '',
  source: '',
  description: '',
  setParameters: [],
  implementedRequirements: [],
});

onMounted(() => {
  Object.assign(controlImplData, {
    ...props.controlImplementation,
    setParameters: [...(props.controlImplementation.setParameters || [])].map(
      (p) => ({
        ...p,
        values: [...(p.values || [])],
        props: [...(p.props || [])],
        links: [...(p.links || [])],
      }),
    ),
  });
});

const addParameter = () => {
  controlImplData.setParameters!.push({
    paramId: '',
    values: [''],
    props: [],
    links: [],
    remarks: '',
  });
};

const removeParameter = (index: number) => {
  controlImplData.setParameters!.splice(index, 1);
};

const addParameterValue = (paramIndex: number) => {
  if (
    controlImplData.setParameters &&
    controlImplData.setParameters[paramIndex]
  ) {
    controlImplData.setParameters[paramIndex].values.push('');
  }
};

const removeParameterValue = (paramIndex: number, valueIndex: number) => {
  if (
    controlImplData.setParameters &&
    controlImplData.setParameters[paramIndex]?.values
  ) {
    controlImplData.setParameters[paramIndex].values.splice(valueIndex, 1);
  }
};

const updateControlImplementation = async () => {
  if (!controlImplData.description.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Description is required.',
      life: 3000,
    });
    return;
  }

  try {
    await executeUpdate({
      data: controlImplData,
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Control implementation updated successfully.',
      life: 3000,
    });

    emit('saved', updatedCI.value!);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    const errorMessage =
      errorResponse.response?.data?.errors.body ||
      'Failed to update control implementation.';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 5000,
    });
  }
};
</script>
