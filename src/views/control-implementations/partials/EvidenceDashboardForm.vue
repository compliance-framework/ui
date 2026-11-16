<script setup lang="ts">
/**
 * A new evidence filter for a statement, built from a baseline piece of evidence: a name, the
 * label conditions picked from that evidence's labels, the filter they make and, when the system
 * has a scope, whether to follow it. Emits `submit`; the parent creates the filter.
 */
import { computed } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { reactive, watch } from 'vue';
import type { LabelCondition, SearchableEvidence } from './form-options';

const props = defineProps<{
  uniqueEvidenceTitles: SearchableEvidence[];
  evidenceLoading: boolean;
  labelConditions: LabelCondition[];
  availableLabelNames: string[];
  availableLabelValues: string[];
  computedFilter: string;
  isSubmitting?: boolean;
  serverError?: string;
  // The SSP has scope entries: offer to make the new filter follow its scope.
  scopeFollowable?: boolean;
}>();

const name = defineModel<string>('name', { required: true });
const selectedBaselineEvidence = defineModel<SearchableEvidence | null>(
  'selectedBaselineEvidence',
  { required: true },
);
const newLabelName = defineModel<string>('newLabelName', { required: true });
const newLabelValue = defineModel<string>('newLabelValue', { required: true });
const followSspScope = defineModel<boolean>('followSspScope', {
  default: true,
});

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
    errors.name = 'Enter a name.';
  }
  return Object.keys(errors).length === 0;
}

function submit() {
  if (!validate()) return;
  emit('submit');
}
// The pickers hold strings; the models keep the classic shapes.
const evidenceOptions = computed(() =>
  props.uniqueEvidenceTitles.map((e) => ({
    value: e.uuid || e.id,
    label: [e.title, e.labels?.map((l) => `${l.name}=${l.value}`).join(', ')]
      .filter(Boolean)
      .join(' · '),
  })),
);
const baselineId = computed({
  get: () =>
    selectedBaselineEvidence.value?.uuid ||
    selectedBaselineEvidence.value?.id ||
    '',
  set: (id: string) =>
    (selectedBaselineEvidence.value =
      props.uniqueEvidenceTitles.find((e) => (e.uuid || e.id) === id) ?? null),
});
const toOptions = (values: string[]) =>
  values.map((value) => ({ value, label: value }));
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <Stack gap="4">
      <FormField label="Name" required :error="errors.name || undefined">
        <TextInput v-model="name" />
      </FormField>
      <FormField
        label="Baseline evidence"
        hint="Its labels are offered as conditions."
      >
        <Combobox
          v-model="baselineId"
          :options="evidenceOptions"
          :loading="evidenceLoading"
          placeholder="Evidence title or label"
        />
      </FormField>
      <Stack v-if="selectedBaselineEvidence" gap="3">
        <Text as="span" variant="label">Label conditions</Text>
        <Stack v-if="labelConditions.length" gap="1" as="ul">
          <li v-for="(condition, index) in labelConditions" :key="index">
            <Cluster justify="between" gap="2">
              <Text as="code" variant="code"
                >{{ condition.name }}={{ condition.value }}</Text
              >
              <IconButton
                icon="close"
                :label="`Remove ${condition.name}=${condition.value}`"
                @click="emit('removeCondition', index)"
              />
            </Cluster>
          </li>
        </Stack>
        <Grid min="sm" gap="2">
          <FormField label="Label">
            <Select
              v-model="newLabelName"
              :options="toOptions(availableLabelNames)"
              placeholder="Choose a label"
            />
          </FormField>
          <FormField label="Value">
            <Select
              v-model="newLabelValue"
              :options="toOptions(availableLabelValues)"
              placeholder="Choose a value"
            />
          </FormField>
        </Grid>
        <div>
          <Button
            icon="add"
            :disabled-reason="
              newLabelName && newLabelValue
                ? undefined
                : 'Choose a label and a value first.'
            "
            @click="emit('addCondition')"
            >Add condition</Button
          >
        </div>
      </Stack>
      <Stack v-if="computedFilter" gap="1">
        <Text as="span" variant="label">Filter</Text>
        <Text as="code" variant="code">{{ computedFilter }}</Text>
      </Stack>
      <Checkbox
        v-if="scopeFollowable"
        v-model="followSspScope"
        label="Follow this system's scope"
        description="The filter only matches this system's evidence, and keeps matching it when the scope changes."
        data-testid="follow-ssp-scope"
      />
      <InlineMessage v-if="serverError" tone="error" title="Not created"
        ><p>{{ serverError }}</p></InlineMessage
      >
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button
          variant="primary"
          type="submit"
          :loading="isSubmitting"
          :disabled-reason="
            computedFilter ? undefined : 'Add a label condition first.'
          "
          >Create evidence filter</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
