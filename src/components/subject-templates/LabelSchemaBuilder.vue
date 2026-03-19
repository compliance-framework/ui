<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <label class="inline-block pb-1 dark:text-slate-300 font-medium">
        Label Schema <span class="text-red-500">*</span>
      </label>
      <TertiaryButton type="button" :disabled="disabled" @click="addSchemaRow">
        Add Field
      </TertiaryButton>
    </div>

    <p class="text-sm text-gray-500 dark:text-slate-400">
      Expected evidence labels used by this template.
    </p>

    <p
      v-if="labelSchema.length === 0"
      class="text-sm text-gray-500 dark:text-slate-400"
    >
      No schema fields configured.
    </p>

    <div
      v-for="(schemaField, index) in labelSchema"
      :key="`schema-field-${index}`"
      class="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2"
    >
      <FormInput
        v-model="schemaField.key"
        :disabled="disabled"
        placeholder="Field key (e.g. repository)"
      />
      <FormInput
        v-model="schemaField.description"
        :disabled="disabled"
        placeholder="Description (optional)"
      />
      <TertiaryButton
        type="button"
        :disabled="disabled"
        @click="removeSchemaRow(index)"
      >
        Remove
      </TertiaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import FormInput from '@/components/forms/FormInput.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import type { SubjectTemplateLabelSchemaFormRow } from '@/types/subject-templates';

interface Props {
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
});

const labelSchema = defineModel<SubjectTemplateLabelSchemaFormRow[]>({
  required: true,
});

function addSchemaRow() {
  labelSchema.value.push({
    key: '',
    description: '',
  });
}

function removeSchemaRow(index: number) {
  labelSchema.value.splice(index, 1);
}
</script>
