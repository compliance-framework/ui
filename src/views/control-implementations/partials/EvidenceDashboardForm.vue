<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { EvidenceLabel } from '@/stores/evidence';
import Label from '@/volt/Label.vue';
import InputText from '@/volt/InputText.vue';
import Select from '@/volt/Select.vue';
import Message from '@/volt/Message.vue';
import Button from '@/volt/Button.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import type { LabelCondition, SearchableEvidence } from './form-options';

defineProps<{
  uniqueEvidenceTitles: SearchableEvidence[];
  evidenceLoading: boolean;
  labelConditions: LabelCondition[];
  availableLabelNames: string[];
  availableLabelValues: string[];
  computedFilter: string;
  isSubmitting?: boolean;
  serverError?: string;
}>();

const name = defineModel<string>('name', { required: true });
const selectedBaselineEvidence = defineModel<SearchableEvidence | null>(
  'selectedBaselineEvidence',
  { required: true },
);
const newLabelName = defineModel<string>('newLabelName', { required: true });
const newLabelValue = defineModel<string>('newLabelValue', { required: true });

const emit = defineEmits<{
  submit: [];
  cancel: [];
  addCondition: [];
  removeCondition: [index: number];
}>();

const errors = reactive<Record<string, string>>({});

watch(name, () => {
  delete errors.name;
});

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  if (!name.value?.trim()) {
    errors.name = 'Dashboard name is required.';
  }
  return Object.keys(errors).length === 0;
}

function submit() {
  if (!validate()) return;
  emit('submit');
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div class="h-0.5 dark:bg-slate-800 bg-gray-400 w-full my-4"></div>
    <div class="flex justify-between items-center">
      <h4 class="m-0">New Evidence Dashboard</h4>
    </div>
    <div>
      <Label for="evidence-dashboard-name" required>Name</Label>
      <InputText
        id="evidence-dashboard-name"
        v-model="name"
        placeholder="Dashboard name"
        class="w-full"
        :invalid="!!errors.name"
      />
      <small v-if="errors.name" class="text-red-500">
        {{ errors.name }}
      </small>
    </div>

    <div>
      <Label for="baseline-evidence">Select Baseline Evidence</Label>
      <Select
        id="baseline-evidence"
        v-model="selectedBaselineEvidence"
        :options="uniqueEvidenceTitles"
        optionLabel="title"
        filter
        :filterFields="['title', 'searchText']"
        placeholder="Select an evidence as baseline..."
        :loading="evidenceLoading"
        class="w-full"
      >
        <template #option="slotProps">
          <div class="flex flex-col">
            <span class="font-medium">{{ slotProps.option.title }}</span>
            <span class="text-xs text-gray-500 dark:text-slate-400">
              {{
                slotProps.option.labels
                  ?.map(
                    (label: EvidenceLabel) => `${label.name}=${label.value}`,
                  )
                  .join(', ')
              }}
            </span>
          </div>
        </template>
      </Select>
    </div>

    <div v-if="selectedBaselineEvidence">
      <Label>Label Conditions</Label>

      <div v-if="labelConditions.length > 0" class="mb-3 space-y-2">
        <div
          v-for="(condition, index) in labelConditions"
          :key="index"
          class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-800 rounded-md"
        >
          <span class="text-sm font-mono flex-1">
            {{ condition.name }}={{ condition.value }}
          </span>
          <Button
            type="button"
            severity="danger"
            text
            size="small"
            class="text-red-500 hover:text-red-700"
            @click="emit('removeCondition', index)"
          >
            Remove
          </Button>
        </div>
      </div>

      <div class="flex gap-2 items-end">
        <div class="flex-1">
          <Label for="evidence-dashboard-label-name">Label Name</Label>
          <Select
            id="evidence-dashboard-label-name"
            v-model="newLabelName"
            :options="availableLabelNames"
            placeholder="Select label..."
            class="w-full"
          />
        </div>
        <div class="flex-1">
          <Label for="evidence-dashboard-label-value">Value</Label>
          <Select
            id="evidence-dashboard-label-value"
            v-model="newLabelValue"
            :options="availableLabelValues"
            placeholder="Select value..."
            :disabled="!newLabelName"
            class="w-full"
          />
        </div>
        <Button
          type="button"
          severity="secondary"
          :disabled="!newLabelName || !newLabelValue"
          @click="emit('addCondition')"
        >
          Add
        </Button>
      </div>
    </div>

    <div v-if="computedFilter">
      <Label>Generated Filter</Label>
      <div
        class="p-3 bg-gray-100 dark:bg-slate-800 rounded-md text-sm font-mono break-all"
      >
        {{ computedFilter }}
      </div>
    </div>

    <Message v-if="serverError" severity="error">
      {{ serverError }}
    </Message>

    <div
      class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700"
    >
      <SecondaryButton type="button" @click="emit('cancel')">
        Cancel
      </SecondaryButton>
      <PrimaryButton
        type="submit"
        :disabled="isSubmitting || !computedFilter"
        v-tooltip.top="
          !computedFilter
            ? 'Add at least one label condition to create a filter'
            : undefined
        "
      >
        <i v-if="isSubmitting" class="pi pi-spin pi-spinner mr-2"></i>
        Create Dashboard
      </PrimaryButton>
    </div>
  </form>
</template>
