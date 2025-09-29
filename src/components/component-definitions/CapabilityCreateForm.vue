<template>
  <form @submit.prevent="createCapability()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">
      Create a new capability
    </h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">UUID</label>
      <div class="flex items-center place-items-stretch">
        <FormInput
          v-model="capability.uuid"
          class="rounded-r-none border-r-0"
        />
        <TertiaryButton
          type="button"
          @click="generateUuid"
          class="py-3 rounded-l-none"
          ><BIconArrowRepeat
        /></TertiaryButton>
      </div>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300"
        >Name <span class="text-red-500">*</span></label
      >
      <FormInput v-model="capability.name" required />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300"
        >Description <span class="text-red-500">*</span></label
      >
      <FormTextarea v-model="capability.description" required />
    </div>

    <!-- Temporarily disabled - these fields may not be in current DB schema
    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Properties</label>
      <FormTextarea
        v-model="capability.props"
        placeholder="Additional properties (JSON format)"
        rows="3"
      />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Links</label>
      <FormTextarea
        v-model="capability.links"
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
      <PrimaryButton type="submit">Create Capability</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')"
        >Cancel</SecondaryButton
      >
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Capability } from '@/oscal';
import { useToast } from 'primevue/usetoast';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { BIconArrowRepeat } from 'bootstrap-icons-vue';
import { v4 as uuidv4 } from 'uuid';
import { useDataApi, decamelizeKeys } from '@/composables/axios';

const toast = useToast();

const props = defineProps<{
  componentDefinitionId: string;
}>();

const emit = defineEmits<{
  created: [capability: Capability];
  cancel: [];
}>();

const capability = ref({
  uuid: uuidv4(),
  name: '',
  description: '',
  // props: '',
  // links: '',
  // incorporatesComponents: [],
  // controlImplementations: [],
});

const { data: newCapability, execute } = useDataApi<Capability>(
  `/api/oscal/component-definitions/${props.componentDefinitionId}/capability`,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const errorMessage = ref('');

async function createCapability(): Promise<void> {
  errorMessage.value = '';

  if (!props.componentDefinitionId) {
    errorMessage.value = 'Component definition ID is missing';
    return;
  }

  if (!capability.value.name?.trim() || !capability.value.description?.trim()) {
    errorMessage.value = 'Name and description are required';
    return;
  }

  try {
    // Only include fields that the backend supports for capability creation
    const capabilityData = {
      uuid: capability.value.uuid,
      name: capability.value.name,
      description: capability.value.description,
      props: [], // Required by TypeScript interface but not stored in DB
      links: [], // Required by TypeScript interface but not stored in DB
      // Skip incorporatesComponents, controlImplementations - they may not exist in DB schema
    };

    await execute({
      data: capabilityData,
    });
    emit('created', newCapability.value!);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Creating Capability',
      detail:
        error instanceof Error ? error.message : 'Failed to create capability',
      life: 3000,
    });
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to create capability';
  }
}

function generateUuid() {
  capability.value.uuid = uuidv4();
}
</script>
