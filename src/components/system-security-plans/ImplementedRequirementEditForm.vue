<template>
  <div class="px-12 py-8">
    <form @submit.prevent="updateRequirement()">

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md">
        <span class="text-gray-600 dark:text-slate-400 font-mono">{{ requirementData.uuid }}</span>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Control ID <span class="text-red-500">*</span></label>
      <FormInput v-model="requirementData.controlId" placeholder="e.g., AC-1, AU-2" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Remarks</label>
      <FormTextarea v-model="requirementData.remarks" rows="3" />
    </div>

    <!-- Properties -->
    <div class="mb-6">
      <label class="inline-block pb-2 dark:text-slate-300">Properties</label>
      <div class="space-y-3">
        <div
          v-for="(prop, index) in requirementData.props"
          :key="index"
          class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
        >
          <div class="flex justify-between items-start mb-2">
            <h4 class="text-sm font-medium dark:text-slate-300">Property {{ index + 1 }}</h4>
            <button
              type="button"
              @click="removeProperty(index)"
              class="text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="inline-block pb-1 text-sm dark:text-slate-300">Name</label>
              <FormInput v-model="prop.name" placeholder="Property name" />
            </div>
            <div>
              <label class="inline-block pb-1 text-sm dark:text-slate-300">Value</label>
              <FormInput v-model="prop.value" placeholder="Property value" />
            </div>
          </div>
        </div>

        <button
          type="button"
          @click="addProperty"
          class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
        >
          Add Property
        </button>
      </div>
    </div>

    <!-- Links -->
    <div class="mb-6">
      <label class="inline-block pb-2 dark:text-slate-300">Links</label>
      <div class="space-y-3">
        <div
          v-for="(link, index) in requirementData.links"
          :key="index"
          class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
        >
          <div class="flex justify-between items-start mb-2">
            <h4 class="text-sm font-medium dark:text-slate-300">Link {{ index + 1 }}</h4>
            <button
              type="button"
              @click="removeLink(index)"
              class="text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="inline-block pb-1 text-sm dark:text-slate-300">Href</label>
              <FormInput v-model="link.href" placeholder="URL or reference" />
            </div>
            <div>
              <label class="inline-block pb-1 text-sm dark:text-slate-300">Rel</label>
              <FormInput v-model="link.rel" placeholder="Relationship" />
            </div>
          </div>
          <div class="mt-2">
            <label class="inline-block pb-1 text-sm dark:text-slate-300">Text</label>
            <FormInput v-model="link.text" placeholder="Link text" />
          </div>
        </div>

        <button
          type="button"
          @click="addLink"
          class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
        >
          Add Link
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
          {{ saving ? 'Saving...' : 'Save Requirement' }}
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
import type { ImplementedRequirement } from '@/stores/system-security-plans.ts';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type { AxiosError } from 'axios';
import type { ErrorBody, ErrorResponse } from '@/stores/types.ts';

const props = defineProps<{
  sspId: string;
  requirement: ImplementedRequirement;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [requirement: ImplementedRequirement];
}>();

const toast = useToast();

const { data: updatedIR, execute: updateRequirementApi, isLoading: saving } = useDataApi<ImplementedRequirement>(
  `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${props.requirement.uuid}`,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys]
  }, { immediate: false }
);

const requirementData = reactive<ImplementedRequirement>({
  uuid: '',
  controlId: '',
  props: [],
  links: [],
  remarks: ''
});

onMounted(() => {
  Object.assign(requirementData, {
    ...props.requirement,
    props: [...(props.requirement.props || [])],
    links: [...(props.requirement.links || [])]
  });
});

const addProperty = () => {
  requirementData.props.push({
    name: '',
    value: '',
    class: '',
    ns: '',
    uuid: crypto.randomUUID()
  });
};

const removeProperty = (index: number) => {
  requirementData.props.splice(index, 1);
};

const addLink = () => {
  requirementData.links.push({
    href: '',
    rel: '',
    text: ''
  });
};

const removeLink = (index: number) => {
  requirementData.links.splice(index, 1);
};

const updateRequirement = async () => {
  if (!requirementData.controlId.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Control ID is required.',
      life: 3000
    });
    return;
  }

  try {
    await updateRequirementApi({
      data: requirementData
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Implemented requirement updated successfully.',
      life: 3000
    });

    emit('saved', updatedIR.value!);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    const errorMessage = errorResponse.response?.data?.errors.body || 'Failed to update implemented requirement.';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 5000
    });
  }
};
</script>
