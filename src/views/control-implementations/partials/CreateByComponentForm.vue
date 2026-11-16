<script setup lang="ts">
/** A new component statement: the component, its description, and implementation status and remarks. Emits `submit`; Create a component asks the parent for a new one. */
import { computed } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { reactive, watch } from 'vue';
import type { SelectOption } from './form-options';

const props = defineProps<{
  componentItems: SelectOption[];
  statusOptions: SelectOption[];
  componentsLoading: boolean;
  isSubmitting?: boolean;
  serverError?: string;
}>();

const selectedComponent = defineModel<SelectOption | null>(
  'selectedComponent',
  {
    required: true,
  },
);
const description = defineModel<string | undefined>('description', {
  required: true,
});
const statusState = defineModel<string>('statusState', { required: true });
const statusRemarks = defineModel<string>('statusRemarks', { required: true });

const emit = defineEmits<{
  submit: [];
  cancel: [];
  createComponent: [];
}>();

const errors = reactive<Record<string, string>>({});

watch(selectedComponent, () => {
  delete errors.component;
});

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  if (!selectedComponent.value?.value) {
    errors.component = 'Please select a valid component.';
  }
  return Object.keys(errors).length === 0;
}

function submit() {
  if (!validate()) return;
  emit('submit');
}

// The native selects hold strings; the models keep the classic shapes.
const toOption = (o: SelectOption) => ({
  value: o.value,
  label: o.name ?? o.label ?? o.value,
});
const componentOptions = computed(() => props.componentItems.map(toOption));
const statusSelectOptions = computed(() => props.statusOptions.map(toOption));
const componentValue = computed({
  get: () => selectedComponent.value?.value ?? '',
  set: (value: string) =>
    (selectedComponent.value =
      props.componentItems.find((o) => o.value === value) ?? null),
});
const descriptionText = computed({
  get: () => description.value ?? '',
  set: (value: string) => (description.value = value),
});
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <Stack gap="4">
      <Cluster justify="between" gap="2">
        <Text as="span" variant="label">New component statement</Text>
        <Button icon="add" @click="emit('createComponent')"
          >Create a component</Button
        >
      </Cluster>
      <FormField
        label="Component"
        required
        :error="errors.component || undefined"
      >
        <Select
          v-model="componentValue"
          :options="componentOptions"
          :placeholder="componentsLoading ? 'Loading…' : 'Choose a component'"
        />
      </FormField>
      <FormField label="Description">
        <Textarea v-model="descriptionText" :rows="5" />
      </FormField>
      <FormField label="Implementation status">
        <Select v-model="statusState" :options="statusSelectOptions" />
      </FormField>
      <FormField v-if="statusState" label="Status remarks">
        <Textarea v-model="statusRemarks" :rows="2" />
      </FormField>
      <InlineMessage v-if="serverError" tone="error" title="Not created"
        ><p>{{ serverError }}</p></InlineMessage
      >
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="isSubmitting"
          >Create statement</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
