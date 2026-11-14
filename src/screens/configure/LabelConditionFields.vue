<script setup lang="ts">
/**
 * Label conditions (label = value) as a field list, with completion: label names from `keys`, and
 * values searched on the server for the label as you type, so any value is reachable however
 * many exist.
 */
import { ref, watch } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { DataResponse } from '@/stores/types';
import {
  buildDashboardSuggestionLabelValuesEndpoint,
  type LabelConditionRow,
} from '@/views/dashboard/partials/dashboard-suggestions';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Grid from '@/ds/components/layout/Grid.vue';

const props = withDefaults(
  defineProps<{
    sspId: string;
    keys: string[];
    legend?: string;
    addLabel?: string;
    /** Suggest values from all evidence, not only the plan's scope (new scope entries). */
    ignoreScope?: boolean;
  }>(),
  { legend: 'Labels', addLabel: 'Add label', ignoreScope: false },
);
const rows = defineModel<LabelConditionRow[]>({ default: () => [] });

const api = useAuthenticatedInstance();
/** Value suggestions by row, refreshed as that row's label or value changes. */
const values = ref<string[][]>([]);

async function suggest(index: number, row: LabelConditionRow) {
  if (!row.key.trim()) {
    values.value[index] = [];
    return;
  }
  try {
    const response = await api.get<DataResponse<string[]>>(
      buildDashboardSuggestionLabelValuesEndpoint(props.sspId),
      {
        params: {
          key: row.key,
          query: row.value,
          ...(props.ignoreScope ? { ignoreScope: true } : {}),
        },
      },
    );
    values.value[index] = response.data.data ?? [];
  } catch {
    values.value[index] = [];
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  rows,
  (list, previous) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      list.forEach((row, index) => {
        const before = previous?.[index];
        if (!before || before.key !== row.key || before.value !== row.value)
          void suggest(index, row);
      });
    }, 250);
  },
  { deep: true },
);
</script>

<template>
  <FieldList
    v-model="rows"
    :legend="legend"
    item-label="label"
    :add-label="addLabel"
    empty-text="No labels yet."
    :new-item="() => ({ key: '', value: '' })"
  >
    <template #item="{ item, index }">
      <Grid min="sm" gap="2">
        <FormField label="Label"
          ><TextInput v-model="item.key" :options="keys"
        /></FormField>
        <FormField label="Value"
          ><TextInput v-model="item.value" :options="values[index] ?? []"
        /></FormField>
      </Grid>
    </template>
  </FieldList>
</template>
