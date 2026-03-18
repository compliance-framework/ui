<template>
  <div class="px-12 py-8">
    <form @submit.prevent="createComponent()">
      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
        <div class="flex gap-2">
          <FormInput
            v-model="componentData.uuid"
            placeholder="Component UUID"
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
          >Component Definition Template</label
        >
        <select
          v-model="selectedComponentDefinitionId"
          class="w-full p-2 border border-ccf-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 dark:text-slate-300"
          :disabled="loadingComponentDefinitions"
        >
          <option value="">No template</option>
          <option
            v-for="definition in componentDefinitions || []"
            :key="definition.uuid"
            :value="definition.uuid"
          >
            {{ definition.metadata.title || definition.uuid }}
          </option>
        </select>
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Defined Component Template</label
        >
        <select
          v-model="selectedDefinedComponentId"
          class="w-full p-2 border border-ccf-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 dark:text-slate-300 disabled:bg-neutral-100 disabled:dark:bg-slate-800 disabled:cursor-not-allowed"
          :disabled="!selectedComponentDefinitionId || loadingDefinedComponents"
        >
          <option value="">
            {{
              selectedComponentDefinitionId
                ? 'No template'
                : 'Select a Component Definition first'
            }}
          </option>
          <option
            v-for="component in definedComponents || []"
            :key="component.uuid"
            :value="component.uuid"
          >
            {{ component.title
            }}{{ component.type ? ` (${component.type})` : '' }}
          </option>
        </select>
      </div>

      <div
        v-if="selectedDefinedComponent"
        class="mb-4 p-3 rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950 text-sm text-blue-900 dark:text-blue-200"
      >
        Fields inherited from the selected Defined Component are read-only.
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Type <span class="text-red-500">*</span></label
        >
        <FormInput
          v-model="componentData.type"
          placeholder="e.g., service, software, hardware"
          :readonly="inheritedFieldLocks.type"
          required
        />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Title <span class="text-red-500">*</span></label
        >
        <FormInput
          v-model="componentData.title"
          :readonly="inheritedFieldLocks.title"
          required
        />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Description <span class="text-red-500">*</span></label
        >
        <FormTextarea
          v-model="componentData.description"
          :readonly="inheritedFieldLocks.description"
          required
        />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300"
          >Purpose <span class="text-red-500">*</span></label
        >
        <FormTextarea
          v-model="componentData.purpose"
          :readonly="inheritedFieldLocks.purpose"
          required
        />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
        <FormTextarea
          v-model="componentData.remarks"
          :readonly="inheritedFieldLocks.remarks"
        />
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
              v-model="componentData.status!.state"
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
            <FormTextarea v-model="componentData.status!.remarks" rows="2" />
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
                :disabled="inheritedFieldLocks.protocols"
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
                  :readonly="inheritedFieldLocks.protocols"
                />
              </div>
              <div>
                <label class="inline-block pb-1 text-sm dark:text-slate-300"
                  >Name</label
                >
                <FormInput
                  v-model="protocol.name"
                  placeholder="Protocol name"
                  :readonly="inheritedFieldLocks.protocols"
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
                    :readonly="inheritedFieldLocks.protocols"
                  />
                  <FormInput
                    v-model="range.start"
                    placeholder="Start port"
                    type="number"
                    class="w-24"
                    :readonly="inheritedFieldLocks.protocols"
                  />
                  <FormInput
                    v-model="range.end"
                    placeholder="End port"
                    type="number"
                    class="w-24"
                    :readonly="inheritedFieldLocks.protocols"
                  />
                  <button
                    type="button"
                    @click="removePortRange(index, rangeIndex)"
                    class="px-2 py-1 text-red-500 hover:text-red-700"
                    :disabled="inheritedFieldLocks.protocols"
                  >
                    ×
                  </button>
                </div>
                <button
                  type="button"
                  @click="addPortRange(index)"
                  class="text-sm px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                  :disabled="inheritedFieldLocks.protocols"
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
            :disabled="inheritedFieldLocks.protocols"
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
          {{ saving ? 'Creating...' : 'Create Component' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import type {
  ComponentDefinition,
  DefinedComponent,
  Protocol,
  SystemComponent,
} from '@/oscal';
import { useDataApi } from '@/composables/axios';
import decamelizeObjectKeys from 'decamelize-keys';
import type { AxiosError, AxiosHeaders } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

const props = defineProps<{
  sspId: string;
}>();

const emit = defineEmits<{
  cancel: [];
  created: [component: SystemComponent];
}>();

const decamelizeComponentRequest = (data: unknown, headers: AxiosHeaders) => {
  headers.set('Content-Type', 'application/json');
  return JSON.stringify(
    decamelizeObjectKeys(data as Record<string, unknown>, {
      separator: '-',
      deep: true,
    }),
  );
};

const toast = useToast();
const {
  data: newComponent,
  execute: executeCreate,
  isLoading: saving,
} = useDataApi<SystemComponent>(
  `/api/oscal/system-security-plans/${props.sspId}/system-implementation/components`,
  {
    method: 'POST',
    transformRequest: [decamelizeComponentRequest],
  },
  { immediate: false },
);

const {
  data: componentDefinitions,
  execute: executeFetchComponentDefinitions,
  isLoading: loadingComponentDefinitions,
} = useDataApi<ComponentDefinition[]>(
  null,
  { method: 'GET' },
  { immediate: false },
);

const {
  data: definedComponents,
  execute: executeFetchDefinedComponents,
  isLoading: loadingDefinedComponents,
} = useDataApi<DefinedComponent[]>(
  null,
  { method: 'GET' },
  { immediate: false },
);

const componentData = reactive<Partial<SystemComponent>>({
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
  definedComponentId: undefined,
});

const selectedComponentDefinitionId = ref('');
const selectedDefinedComponentId = ref('');

const selectedDefinedComponent = computed(() =>
  (definedComponents.value || []).find(
    (component) => component.uuid === selectedDefinedComponentId.value,
  ),
);

const hasText = (value?: string): boolean =>
  typeof value === 'string' && value.trim().length > 0;

const inheritedFieldLocks = computed(() => {
  const template = selectedDefinedComponent.value;
  return {
    type: hasText(template?.type),
    title: hasText(template?.title),
    description: hasText(template?.description),
    purpose: hasText(template?.purpose),
    remarks: hasText(template?.remarks),
    protocols: (template?.protocols?.length || 0) > 0,
  };
});

const cloneProtocols = (protocols?: Protocol[]): Protocol[] =>
  (protocols || []).map((protocol) => ({
    ...protocol,
    portRanges: (protocol.portRanges || []).map((range) => ({
      ...range,
    })),
  }));

const applyTemplateToComponent = (template: DefinedComponent) => {
  componentData.type = template.type || '';
  componentData.title = template.title || '';
  componentData.description = template.description || '';
  componentData.purpose = template.purpose || '';
  componentData.remarks = template.remarks || '';
  componentData.definedComponentId = template.uuid;
  componentData.protocols = cloneProtocols(template.protocols);
  componentData.props = [...(template.props || [])].map((prop) => ({
    ...prop,
  }));
  componentData.links = [...(template.links || [])].map((link) => ({
    ...link,
  }));
  componentData.responsibleRoles = [...(template.responsibleRoles || [])].map(
    (role) => ({
      ...role,
    }),
  );
};

const loadComponentDefinitions = async () => {
  try {
    await executeFetchComponentDefinitions('/api/oscal/component-definitions');
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        errorResponse.response?.data.errors.body ||
        'Failed to load component definitions.',
      life: 4000,
    });
  }
};

const loadDefinedComponents = async (componentDefinitionId: string) => {
  if (!componentDefinitionId) {
    definedComponents.value = [];
    return;
  }

  try {
    await executeFetchDefinedComponents(
      `/api/oscal/component-definitions/${componentDefinitionId}/components`,
    );
  } catch (error) {
    definedComponents.value = [];
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        errorResponse.response?.data.errors.body ||
        'Failed to load defined components.',
      life: 4000,
    });
  }
};

watch(selectedComponentDefinitionId, async (componentDefinitionId) => {
  selectedDefinedComponentId.value = '';
  await loadDefinedComponents(componentDefinitionId);
});

watch(selectedDefinedComponentId, (definedComponentId) => {
  if (!definedComponentId) {
    componentData.definedComponentId = undefined;
    return;
  }
  const template = (definedComponents.value || []).find(
    (component) => component.uuid === definedComponentId,
  );
  if (template) {
    applyTemplateToComponent(template);
  }
});

onMounted(async () => {
  generateUUID();
  await loadComponentDefinitions();
});

const generateUUID = () => {
  componentData.uuid = crypto.randomUUID();
};

const addProtocol = () => {
  componentData.protocols!.push({
    uuid: crypto.randomUUID(),
    title: '',
    name: '',
    portRanges: [],
  });
};

const removeProtocol = (index: number) => {
  componentData.protocols!.splice(index, 1);
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

const createComponent = async () => {
  if (
    !componentData.title?.trim() ||
    !componentData.description?.trim() ||
    !componentData.purpose?.trim() ||
    !componentData.type?.trim()
  ) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Type, title, description, and purpose are required fields.',
      life: 3000,
    });
    return;
  }

  if (!componentData.status?.state) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Status state is required.',
      life: 3000,
    });
    return;
  }

  // Clean up protocols - remove empty ones
  if (componentData.protocols) {
    componentData.protocols = componentData.protocols.filter(
      (p) => p.title || p.name || (p.portRanges?.length || 0) > 0,
    );
  }

  try {
    await executeCreate({
      data: componentData,
    });

    // Verify the component was actually created
    if (!newComponent.value || !newComponent.value.uuid) {
      throw new Error(
        'Invalid response from server - component may not have been created',
      );
    }

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Component created successfully.',
      life: 3000,
    });

    emit('created', newComponent.value);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        errorResponse.response?.data.errors.body ||
        'An error occurred while creating the component.',
      life: 5000,
    });
  }
};
</script>
