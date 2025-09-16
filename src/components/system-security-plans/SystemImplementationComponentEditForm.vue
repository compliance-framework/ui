<template>
  <div class="px-12 py-8">
    <form @submit.prevent="updateComponent()">
      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
        <div
          class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md"
        >
          <span class="text-gray-600 dark:text-slate-400 font-mono">{{
            componentData.uuid
          }}</span>
        </div>
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Type <span class="text-red-500">*</span></label
        >
        <FormInput
          v-model="componentData.type"
          placeholder="e.g., service, software, hardware"
          required
        />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Title <span class="text-red-500">*</span></label
        >
        <FormInput v-model="componentData.title" required />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Description <span class="text-red-500">*</span></label
        >
        <FormTextarea v-model="componentData.description" required />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Purpose <span class="text-red-500">*</span></label
        >
        <FormTextarea v-model="componentData.purpose" required />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
        <FormTextarea v-model="componentData.remarks" />
      </div>

      <!-- Status -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Status</label>
        <div
          class="p-4 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
        >
          <div class="mb-3">
            <label class="inline-block pb-1 text-sm dark:text-slate-300"
              >State <span class="text-red-500">*</span></label
            >
            <select
              v-model="componentData.status.state"
              class="w-full p-2 border border-ccf-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 dark:text-slate-300"
              required
            >
              <option value="">Select status</option>
              <option value="operational">Operational</option>
              <option value="under-development">Under Development</option>
              <option value="under-major-modification">
                Under Major Modification
              </option>
              <option value="disposition">Disposition</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300"
              >Remarks</label
            >
            <FormTextarea v-model="componentData.status.remarks" rows="2" />
          </div>
        </div>
      </div>

      <!-- Protocols -->
      <div class="mb-6">
        <label class="inline-block pb-2 dark:text-slate-300">Protocols</label>
        <div class="space-y-4">
          <div
            v-for="(protocol, index) in componentData.protocols"
            :key="index"
            class="p-4 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
          >
            <div class="flex justify-between items-start mb-3">
              <h4 class="text-sm font-medium dark:text-slate-300">
                Protocol {{ index + 1 }}
              </h4>
              <button
                type="button"
                @click="removeProtocol(index)"
                class="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label class="inline-block pb-1 text-sm dark:text-slate-300"
                  >Title</label
                >
                <FormInput
                  v-model="protocol.title"
                  placeholder="Protocol title"
                />
              </div>
              <div>
                <label class="inline-block pb-1 text-sm dark:text-slate-300"
                  >Name</label
                >
                <FormInput
                  v-model="protocol.name"
                  placeholder="Protocol name"
                />
              </div>
            </div>

            <!-- Port Ranges -->
            <div class="mb-3">
              <label class="inline-block pb-1 text-sm dark:text-slate-300"
                >Port Ranges</label
              >
              <div class="space-y-2">
                <div
                  v-for="(range, rangeIndex) in protocol.portRanges"
                  :key="rangeIndex"
                  class="flex gap-2"
                >
                  <FormInput
                    v-model="range.transport"
                    placeholder="Transport (TCP/UDP)"
                    class="flex-1"
                  />
                  <FormInput
                    v-model="range.start"
                    placeholder="Start port"
                    type="number"
                    class="w-24"
                  />
                  <FormInput
                    v-model="range.end"
                    placeholder="End port"
                    type="number"
                    class="w-24"
                  />
                  <button
                    type="button"
                    @click="removePortRange(index, rangeIndex)"
                    class="px-2 py-1 text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
                <button
                  type="button"
                  @click="addPortRange(index)"
                  class="text-sm px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Add Port Range
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            @click="addProtocol"
            class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
          >
            Add Protocol
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
          {{ saving ? 'Saving...' : 'Save Component' }}
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
import type { SystemComponent } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

const props = defineProps<{
  sspId: string;
  component: SystemComponent;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [component: SystemComponent];
}>();

const toast = useToast();
const {
  data: updatedComponent,
  execute: executeUpdate,
  isLoading: saving,
} = useDataApi<SystemComponent>(
  `/api/oscal/system-security-plans/${props.sspId}/system-implementation/components/${props.component.uuid}`,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const componentData = reactive<SystemComponent>({
  uuid: '',
  type: '',
  title: '',
  description: '',
  purpose: '',
  status: {
    remarks: '',
    state: '',
  },
  protocols: [],
  remarks: '',
  props: [],
  links: [],
});

onMounted(() => {
  Object.assign(componentData, {
    ...props.component,
    protocols: [...(props.component.protocols || [])].map((p) => ({
      ...p,
      portRanges: [...(p.portRanges || [])],
    })),
  });
});

const addProtocol = () => {
  componentData.protocols?.push({
    uuid: crypto.randomUUID(),
    title: '',
    name: '',
    portRanges: [],
  });
};

const removeProtocol = (index: number) => {
  componentData.protocols?.splice(index, 1);
};

const addPortRange = (protocolIndex: number) => {
  if (componentData.protocols && componentData.protocols[protocolIndex]) {
    if (!componentData.protocols[protocolIndex].portRanges) {
      componentData.protocols[protocolIndex].portRanges = [];
    }
    componentData.protocols[protocolIndex].portRanges.push({
      transport: '',
      start: 0,
      end: 0,
    });
  }
};

const removePortRange = (protocolIndex: number, rangeIndex: number) => {
  if (
    componentData.protocols &&
    componentData.protocols[protocolIndex]?.portRanges
  ) {
    componentData.protocols[protocolIndex].portRanges.splice(rangeIndex, 1);
  }
};

const updateComponent = async () => {
  if (
    !componentData.title.trim() ||
    !componentData.description.trim() ||
    !componentData.purpose?.trim() ||
    !componentData.type.trim()
  ) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Type, title, description, and purpose are required fields.',
      life: 3000,
    });
    return;
  }

  if (!componentData.status.state) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Status state is required.',
      life: 3000,
    });
    return;
  }

  try {
    await executeUpdate({
      data: componentData,
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Component updated successfully.',
      life: 3000,
    });

    emit('saved', updatedComponent.value!);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        errorResponse?.response?.data?.errors.body ||
        'An unknown error occurred',
      life: 5000,
    });
  }
};
</script>
