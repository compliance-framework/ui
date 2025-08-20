<template>
  <form @submit.prevent="updateImportDefinition()">
    <h1 class="text-xl font-semibold mb-6 dark:text-slate-300">
      Edit Import Definition
    </h1>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300"
        >HREF <span class="text-red-500">*</span></label
      >
      <FormInput
        v-model="importDefData.href"
        placeholder="e.g., https://example.com/definition.json"
        required
      />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300"
        >Include All Components</label
      >
      <div class="flex items-center">
        <input
          type="checkbox"
          v-model="importDefData.includeAll"
          class="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <span class="text-sm dark:text-slate-400"
          >Include all components from this definition</span
        >
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
    >
      {{ errorMessage }}
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Update Import Definition</PrimaryButton>
      <SecondaryButton type="button" @click="$emit('cancel')"
        >Cancel</SecondaryButton
      >
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  useComponentDefinitionStore,
  type ImportComponentDefinition,
} from '@/stores/component-definitions.ts';
import { useToast } from 'primevue/usetoast';
import FormInput from '@/components/forms/FormInput.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SecondaryButton from '@/components/SecondaryButton.vue';

const componentDefinitionStore = useComponentDefinitionStore();
const toast = useToast();

const props = defineProps<{
  componentDefinitionId: string;
  importDefinition: ImportComponentDefinition;
  allImportDefinitions: ImportComponentDefinition[];
}>();

const emit = defineEmits<{
  updated: [importDefinitions: ImportComponentDefinition[]];
  cancel: [];
}>();

const importDefData = ref<ImportComponentDefinition>({
  href: props.importDefinition.href,
  includeAll: props.importDefinition.includeAll || false,
  includeComponents: props.importDefinition.includeComponents || [],
  excludeComponents: props.importDefinition.excludeComponents || [],
});

const errorMessage = ref('');

async function updateImportDefinition(): Promise<void> {
  errorMessage.value = '';

  if (!props.componentDefinitionId) {
    errorMessage.value = 'Component definition ID is missing';
    return;
  }

  if (!importDefData.value.href?.trim()) {
    errorMessage.value = 'HREF is required';
    return;
  }

  try {
    // Update the specific import definition in the array
    const updatedImportDefinitions = props.allImportDefinitions.map((def) =>
      def.href === props.importDefinition.href ? importDefData.value : def,
    );

    await componentDefinitionStore.updateImportComponentDefinitions(
      props.componentDefinitionId,
      updatedImportDefinitions,
    );

    emit('updated', updatedImportDefinitions);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Updating Import Definition',
      detail:
        error instanceof Error
          ? error.message
          : 'Failed to update import definition',
      life: 3000,
    });
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'Failed to update import definition';
  }
}
</script>
