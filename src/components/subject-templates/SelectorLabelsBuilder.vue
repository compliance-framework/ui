<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <label class="inline-block pb-1 dark:text-slate-300 font-medium">
        Selector Labels <span class="text-red-500">*</span>
      </label>
      <TertiaryButton
        type="button"
        :disabled="disabled"
        @click="addSelectorLabel"
      >
        Add Label
      </TertiaryButton>
    </div>

    <p class="text-sm text-gray-500 dark:text-slate-400">
      Labels that must match evidence for this template to apply.
    </p>

    <p
      v-if="selectorLabels.length === 0"
      class="text-sm text-gray-500 dark:text-slate-400"
    >
      No selector labels configured.
    </p>

    <div
      v-for="(selectorLabel, index) in selectorLabels"
      :key="`selector-label-${index}`"
      class="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2"
    >
      <FormInput
        v-model="selectorLabel.key"
        :disabled="disabled"
        placeholder="Label key (e.g. plugin)"
      />
      <FormInput
        v-model="selectorLabel.value"
        :disabled="disabled"
        placeholder="Label value (e.g. github)"
      />
      <TertiaryButton
        type="button"
        :disabled="disabled"
        @click="removeSelectorLabel(index)"
      >
        Remove
      </TertiaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import FormInput from '@/components/forms/FormInput.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import type { SubjectTemplateSelectorLabelFormRow } from '@/types/subject-templates';

interface Props {
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
});

const selectorLabels = defineModel<SubjectTemplateSelectorLabelFormRow[]>({
  required: true,
});

function addSelectorLabel() {
  selectorLabels.value.push({
    key: '',
    value: '',
  });
}

function removeSelectorLabel(index: number) {
  selectorLabels.value.splice(index, 1);
}
</script>
