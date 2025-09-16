<template>
  <form @submit.prevent="updateComponent()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">
      Edit component
    </h1>

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

    <!-- Temporarily disabled - these fields don't exist in current DB schema
    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Properties</label>
      <FormTextarea
        v-model="componentData.props"
        placeholder="Additional properties (JSON format)"
        rows="3"
      />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Links</label>
      <FormTextarea
        v-model="componentData.links"
        placeholder="External links (JSON format)"
        rows="3"
      />
    </div>
    -->

    <div
      v-if="errorMessage"
      class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
    >
      {{ errorMessage }}
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Update Component</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')"
        >Cancel</SecondaryButton
      >
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { DefinedComponent } from '@/oscal';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SecondaryButton from '@/components/SecondaryButton.vue';
import { useToast } from 'primevue/usetoast';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorResponse, ErrorBody } from '@/stores/types';

const toast = useToast();

const props = defineProps<{
  componentDefinitionId: string;
  component: DefinedComponent;
}>();

const emit = defineEmits<{
  updated: [component: DefinedComponent];
  cancel: [];
}>();

const { data: definedComponent, execute } = useDataApi<DefinedComponent>(
  `/api/oscal/component-definitions/${props.componentDefinitionId}/components/${props.component.uuid}`,
  { method: 'PUT', transformRequest: [decamelizeKeys] },
  { immediate: false },
);

const componentData = ref({
  uuid: '',
  type: '',
  title: '',
  description: '',
  purpose: '',
  // props: '',
  // links: '',
  // responsibleRoles: [],
  // protocols: [],
  // controlImplementations: [],
});

const errorMessage = ref('');

onMounted(() => {
  if (props.component) {
    componentData.value = {
      uuid: props.component.uuid,
      type: props.component.type || '',
      title: props.component.title || '',
      description: props.component.description || '',
      purpose: props.component.purpose || '',
      // props: JSON.stringify(props.component.props || [], null, 2),
      // links: JSON.stringify(props.component.links || [], null, 2),
      // responsibleRoles: props.component.responsibleRoles || [],
      // protocols: props.component.protocols || [],
      // controlImplementations: props.component.controlImplementations || [],
    };
  }
});

async function updateComponent(): Promise<void> {
  errorMessage.value = '';

  const actualComponentDefinitionId = props.componentDefinitionId;

  if (!actualComponentDefinitionId) {
    errorMessage.value = 'Component definition ID is missing';
    return;
  }

  if (!componentData.value.uuid) {
    errorMessage.value = 'Component UUID is missing';
    return;
  }

  if (
    !componentData.value.type?.trim() ||
    !componentData.value.title?.trim() ||
    !componentData.value.description?.trim() ||
    !componentData.value.purpose?.trim()
  ) {
    errorMessage.value = 'All required fields must be filled';
    return;
  }

  try {
    // Only include fields that the backend supports for updates
    const updatedComponentData = {
      uuid: componentData.value.uuid,
      type: componentData.value.type,
      title: componentData.value.title,
      description: componentData.value.description,
      purpose: componentData.value.purpose,
      props: [], // Required by TypeScript interface but not stored in DB
      links: [], // Required by TypeScript interface but not stored in DB
      // Skip responsibleRoles, protocols, controlImplementations - they don't exist in DB schema
    };

    await execute({
      data: updatedComponentData,
    });
    toast.add({
      severity: 'success',
      summary: 'Component updated successfully',
      life: 3000,
    });
    emit('updated', definedComponent.value!);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    const errorText =
      errorResponse.response?.data.errors.body ||
      'An error occurred while updating the component.';
    toast.add({
      severity: 'error',
      summary: 'Error updating component',
      detail: errorText,
      life: 3000,
    });
    errorMessage.value = errorText;
  }
}
</script>
