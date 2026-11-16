<script setup lang="ts">
/** Linking an existing evidence filter to a statement. Emits `submit` with the filter in `selectedDashboard`. */
import { computed } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { reactive, watch } from 'vue';
import type { Dashboard } from '@/stores/filters';

const props = defineProps<{
  dashboards: Dashboard[];
  isSubmitting?: boolean;
  serverError?: string;
}>();

const selectedDashboard = defineModel<Dashboard | null>('selectedDashboard', {
  required: true,
});

const emit = defineEmits<{
  submit: [];
  cancel: [];
}>();

const errors = reactive<Record<string, string>>({});

watch(selectedDashboard, () => {
  delete errors.dashboard;
});

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  if (!selectedDashboard.value) {
    errors.dashboard = 'Choose an evidence filter.';
  }
  return Object.keys(errors).length === 0;
}

function submit() {
  if (!validate()) return;
  emit('submit');
}

// The picker holds the filter's ID; the model keeps the filter.
const dashboardOptions = computed(() =>
  props.dashboards
    .filter((d) => d.id)
    .map((d) => ({ value: d.id!, label: d.name })),
);
const dashboardId = computed({
  get: () => selectedDashboard.value?.id ?? '',
  set: (id: string) =>
    (selectedDashboard.value =
      props.dashboards.find((d) => d.id === id) ?? null),
});
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <Stack gap="4">
      <FormField
        label="Evidence filter"
        required
        :error="errors.dashboard || undefined"
      >
        <Combobox
          v-model="dashboardId"
          :options="dashboardOptions"
          placeholder="Filter name"
        />
      </FormField>
      <InlineMessage v-if="serverError" tone="error" title="Not linked"
        ><p>{{ serverError }}</p></InlineMessage
      >
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="isSubmitting"
          >Link evidence filter</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
