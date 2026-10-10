<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="(row, index) in rows"
      :key="index"
      class="flex items-center gap-2"
      :data-testid="`${testid}-${index}`"
    >
      <AutoComplete
        :modelValue="row.key"
        :suggestions="keySuggestions"
        dropdown
        class="w-1/2"
        inputClass="w-full"
        placeholder="label"
        @complete="onKeyComplete"
        @update:modelValue="(value: string) => updateRow(index, 'key', value)"
      />
      <span class="text-gray-400">=</span>
      <AutoComplete
        :modelValue="row.value"
        :suggestions="valueSuggestions"
        dropdown
        class="w-1/2"
        inputClass="w-full"
        :placeholder="valuePlaceholder"
        @complete="onValueComplete($event, row.key)"
        @update:modelValue="(value: string) => updateRow(index, 'value', value)"
      />
      <SecondaryButton
        type="button"
        aria-label="Remove"
        @click="removeRow(index)"
      >
        <i class="pi pi-trash" />
      </SecondaryButton>
    </div>
    <div>
      <SecondaryButton
        type="button"
        :data-testid="`add-${testid}`"
        @click="addRow"
      >
        {{ addLabel }}
      </SecondaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AutoComplete from '@/volt/AutoComplete.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import {
  buildDashboardSuggestionLabelValuesEndpoint,
  type LabelConditionRow,
} from './dashboard-suggestions';
import type { DataResponse } from '@/stores/types';

const props = withDefaults(
  defineProps<{
    sspId: string;
    keys: string[];
    addLabel?: string;
    valuePlaceholder?: string;
    testid?: string;
  }>(),
  {
    addLabel: 'Add condition',
    valuePlaceholder: 'value',
    testid: 'condition',
  },
);

// Two-way bound list of conditions. Values are searched server-side, so any
// value is reachable regardless of how many exist.
const rows = defineModel<LabelConditionRow[]>({ default: () => [] });

const axios = useAuthenticatedInstance();
const keySuggestions = ref<string[]>([]);
const valueSuggestions = ref<string[]>([]);

function addRow() {
  rows.value = [...rows.value, { key: '', value: '' }];
}

function removeRow(index: number) {
  rows.value = rows.value.filter((_, i) => i !== index);
}

function updateRow(
  index: number,
  field: keyof LabelConditionRow,
  value: string,
) {
  rows.value = rows.value.map((row, i) =>
    i === index ? { ...row, [field]: value } : row,
  );
}

function onKeyComplete(event: { query: string }) {
  const query = event.query.toLowerCase();
  keySuggestions.value = props.keys.filter((key) =>
    key.toLowerCase().includes(query),
  );
}

async function onValueComplete(event: { query: string }, key: string) {
  if (!key.trim()) {
    valueSuggestions.value = [];
    return;
  }
  try {
    const response = await axios.get<DataResponse<string[]>>(
      buildDashboardSuggestionLabelValuesEndpoint(props.sspId),
      { params: { key, query: event.query } },
    );
    valueSuggestions.value = response.data.data ?? [];
  } catch {
    valueSuggestions.value = [];
  }
}
</script>
