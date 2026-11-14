<script setup lang="ts">
/**
 * What to generate suggestions for: the controls (all by default), the evidence to analyse (label
 * conditions), whether to replace pending suggestions, and constraints (a preset, required and
 * excluded labels). It previews the AI calls the scope would make and asks to confirm a large
 * run. Emits `generate` with the request. The script is the classic dialog's.
 */
import { computed, onUnmounted, ref, watch } from 'vue';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import type {
  DashboardSuggestionConstraints,
  DashboardSuggestionsPreview,
  DashboardSuggestionLabelKey,
  GenerateDashboardSuggestionsPayload,
  LabelSelector,
} from '@/views/dashboard/partials/dashboard-suggestions';
import {
  buildLabelFilter,
  buildPreviewDashboardSuggestionsEndpoint,
  type LabelConditionRow,
} from '@/views/dashboard/partials/dashboard-suggestions';
import Button from '@/ds/components/Button/Button.vue';
import Checkbox from '@/ds/components/Checkbox/Checkbox.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import LabelConditionFields from '@/screens/configure/LabelConditionFields.vue';
import type { DataResponse } from '@/stores/types';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can } = usePermissions();
const createDenied = computed(() =>
  can(RESOURCES.DASHBOARD_SUGGESTION, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include generating suggestions.",
);

interface ControlOption {
  label: string;
  value: string;
  controlId?: string;
  title?: string;
  catalogTitle?: string;
  profileTitles?: string[];
}

type ScopePreset = 'all' | 'new_filter' | 'extend_filter' | 'no_filters';

const scopePresetOptions: { label: string; value: ScopePreset }[] = [
  { label: 'All suggestions', value: 'all' },
  { label: 'Only create new filters', value: 'new_filter' },
  { label: 'Only change existing filters', value: 'extend_filter' },
  { label: 'Only controls without filters', value: 'no_filters' },
];

const props = defineProps<{
  sspId: string;
  controls: ControlOption[];
  labelKeys: DashboardSuggestionLabelKey[];
  generating?: boolean;
  ceilingError?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  'scope-change': [];
  generate: [payload: GenerateDashboardSuggestionsPayload];
}>();

const selectedControls = ref<string[]>([]);
const conditions = ref<LabelConditionRow[]>([]);
const supersedePending = ref(true);
const scopePreset = ref<ScopePreset>('all');
const mandatoryRows = ref<LabelConditionRow[]>([]);
const excludedRows = ref<LabelConditionRow[]>([]);
const largeRunConfirmed = ref(false);
const preview = ref<DashboardSuggestionsPreview | null>(null);
const previewLoading = ref(false);
const previewError = ref('');
const warningThreshold = 25;
const axios = useAuthenticatedInstance();
let previewTimer: ReturnType<typeof setTimeout> | undefined;
let latestPreviewRequestId = 0;

// Mounted only while its dialog is open.
const modelVisible = computed(() => true);

const requiresLargeRunConfirm = computed(
  () => (preview.value?.plannedCalls ?? 0) > warningThreshold,
);
const scopeError = computed(() => props.ceilingError || previewError.value);
const canGenerate = computed(
  () =>
    !!preview.value &&
    preview.value.plannedCalls > 0 &&
    !previewLoading.value &&
    !scopeError.value &&
    (!requiresLargeRunConfirm.value || largeRunConfirmed.value),
);
// Label keys for the condition builders' key autocomplete (low cardinality, so
// loaded up front; values are searched server-side inside the builder).
const keyNames = computed(() => props.labelKeys.map((entry) => entry.key));

watch(
  () => props.controls,
  (controls) => {
    selectedControls.value = controls.map((control) => control.value);
  },
  { immediate: true },
);

// "All controls", or a chosen few: a list with Remove and a picker for one more.
const allControls = computed({
  get: () => selectedControls.value.length === props.controls.length,
  set: (all: boolean) =>
    (selectedControls.value = all
      ? props.controls.map((control) => control.value)
      : []),
});
const controlLabel = (value: string) => {
  const option = props.controls.find((control) => control.value === value);
  if (!option) return value;
  const name =
    option.controlId && option.title
      ? `${option.controlId} - ${option.title}`
      : option.label;
  return option.catalogTitle ? `${name} (${option.catalogTitle})` : name;
};
const controlChoices = computed(() =>
  props.controls
    .filter((control) => !selectedControls.value.includes(control.value))
    .map((control) => ({
      value: control.value,
      label: controlLabel(control.value),
    })),
);
const controlToAdd = ref('');
watch(controlToAdd, (value) => {
  if (!value) return;
  selectedControls.value = [...selectedControls.value, value];
  controlToAdd.value = '';
});

watch(
  [selectedControls, conditions, scopePreset, mandatoryRows, excludedRows],
  () => {
    largeRunConfirmed.value = false;
    previewError.value = '';
    emit('scope-change');
    schedulePreview();
  },
  { deep: true },
);

watch(
  [modelVisible],
  () => {
    largeRunConfirmed.value = false;
    schedulePreview();
  },
  { immediate: true },
);

watch(
  () => props.sspId,
  () => {
    schedulePreview();
  },
);

watch(
  () => props.controls,
  () => {
    schedulePreview();
  },
);

function selectedScope(): GenerateDashboardSuggestionsPayload['scope'] {
  const scope: GenerateDashboardSuggestionsPayload['scope'] = {};
  if (selectedControls.value.length !== props.controls.length) {
    scope.controlKeys = selectedControls.value;
  }
  const labelFilter = buildLabelFilter(conditions.value);
  if (labelFilter) {
    scope.labelFilter = labelFilter;
  }
  return Object.keys(scope).length > 0 ? scope : undefined;
}

// Maps condition rows to label selectors: a blank value means "any value"
// (key-only selector, sent as value: null).
function rowsToSelectors(rows: LabelConditionRow[]): LabelSelector[] {
  return rows
    .filter((row) => row.key.trim())
    .map((row) => ({
      key: row.key.trim(),
      value: row.value.trim() ? row.value.trim() : null,
    }));
}

function selectedConstraints(): DashboardSuggestionConstraints | undefined {
  const constraints: DashboardSuggestionConstraints = {};
  const mandatory = rowsToSelectors(mandatoryRows.value);
  const excluded = rowsToSelectors(excludedRows.value);
  if (mandatory.length > 0) {
    constraints.mandatoryLabels = mandatory;
  }
  if (excluded.length > 0) {
    constraints.excludedLabels = excluded;
  }
  if (
    scopePreset.value === 'new_filter' ||
    scopePreset.value === 'extend_filter'
  ) {
    constraints.onlyAction = scopePreset.value;
  } else if (scopePreset.value === 'no_filters') {
    constraints.onlyControlsWithoutFilters = true;
  }
  return Object.keys(constraints).length > 0 ? constraints : undefined;
}

function submit() {
  if (!canGenerate.value) {
    return;
  }
  emit('generate', {
    supersedePending: supersedePending.value,
    scope: selectedScope(),
    constraints: selectedConstraints(),
  });
}

function schedulePreview() {
  const requestId = latestPreviewRequestId + 1;
  latestPreviewRequestId = requestId;

  if (previewTimer) {
    clearTimeout(previewTimer);
  }
  preview.value = null;
  previewError.value = '';

  if (!modelVisible.value || !props.sspId) {
    previewLoading.value = false;
    return;
  }

  previewLoading.value = true;
  previewTimer = setTimeout(() => {
    void fetchPreview(requestId);
  }, 250);
}

onUnmounted(() => {
  if (previewTimer) {
    clearTimeout(previewTimer);
  }
});

async function fetchPreview(requestId: number) {
  try {
    const scope = selectedScope();
    const constraints = selectedConstraints();
    const body: GenerateDashboardSuggestionsPayload = {};
    if (scope) {
      body.scope = scope;
    }
    if (constraints) {
      body.constraints = constraints;
    }
    const response = await axios.post<
      DataResponse<DashboardSuggestionsPreview>
    >(
      buildPreviewDashboardSuggestionsEndpoint(props.sspId),
      body,
      // Backend expects kebab-case keys (e.g. `control-keys`); without this the
      // scope keys go out as camelCase and the API reads an empty scope (422).
      { transformRequest: [decamelizeKeys] },
    );
    if (requestId !== latestPreviewRequestId) {
      return;
    }
    preview.value = response.data.data;
    previewError.value = '';
  } catch (error) {
    if (requestId !== latestPreviewRequestId) {
      return;
    }
    const status = (error as { response?: { status?: number } }).response
      ?.status;
    preview.value = null;
    previewError.value =
      status === 422
        ? 'The selected scope does not include any controls or label sets.'
        : 'Unable to preview the selected suggestion scope.';
  } finally {
    if (requestId === latestPreviewRequestId) {
      previewLoading.value = false;
    }
  }
}
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <Stack gap="5">
      <Stack gap="2">
        <Checkbox
          v-model="allControls"
          label="All controls"
          :description="`The ${controls.length} controls this system implements.`"
        />
        <template v-if="!allControls">
          <Stack v-if="selectedControls.length" gap="1" as="ul">
            <li v-for="value in selectedControls" :key="value">
              <Cluster justify="between" gap="2">
                <Text as="span">{{ controlLabel(value) }}</Text>
                <IconButton
                  icon="close"
                  :label="`Remove ${value}`"
                  @click="
                    selectedControls = selectedControls.filter(
                      (v) => v !== value,
                    )
                  "
                />
              </Cluster>
            </li>
          </Stack>
          <FormField label="Add a control">
            <Combobox
              v-model="controlToAdd"
              :options="controlChoices"
              placeholder="Control ID or title"
            />
          </FormField>
        </template>
      </Stack>
      <LabelConditionFields
        v-model="conditions"
        :ssp-id="sspId"
        :keys="keyNames"
        legend="Evidence to analyse"
        add-label="Add condition"
      />
      <Text variant="caption"
        >Every condition must match. Leave it empty to consider all
        evidence.</Text
      >
      <Checkbox
        v-model="supersedePending"
        label="Replace pending suggestions in this scope"
      />
      <FormField label="Suggest">
        <Select v-model="scopePreset" :options="scopePresetOptions" />
      </FormField>
      <LabelConditionFields
        v-model="mandatoryRows"
        :ssp-id="sspId"
        :keys="keyNames"
        legend="Required labels"
        add-label="Add required label"
      />
      <LabelConditionFields
        v-model="excludedRows"
        :ssp-id="sspId"
        :keys="keyNames"
        legend="Excluded labels"
        add-label="Add excluded label"
      />
      <Text variant="caption"
        >Suggested filters always include the required labels and never the
        excluded ones. Leave a value blank to mean any value.</Text
      >
      <InlineMessage
        v-if="scopeError"
        tone="error"
        title="Can't generate for this scope"
        data-testid="scope-ceiling"
        ><p>{{ scopeError }}</p></InlineMessage
      >
      <Text v-else-if="previewLoading || !preview" variant="caption"
        >Estimating the AI calls…</Text
      >
      <InlineMessage
        v-else-if="requiresLargeRunConfirm"
        tone="warning"
        title="A large run"
        data-testid="scope-warning"
        ><p>
          This makes {{ preview.plannedCalls }} AI calls, covering
          {{ preview.controlCount }} controls × {{ preview.labelSetCount }}
          label sets. They run as queued background jobs, may take a while and
          cost money.
        </p></InlineMessage
      >
      <Text v-else
        >{{ preview.plannedCalls }} AI calls, covering
        {{ preview.controlCount }} controls × {{ preview.labelSetCount }} label
        sets.</Text
      >
      <Checkbox
        v-if="requiresLargeRunConfirm"
        v-model="largeRunConfirmed"
        label="Confirm this larger run"
        data-testid="scope-confirm-large"
      />
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button
          variant="primary"
          type="submit"
          :loading="generating"
          :disabled-reason="
            createDenied ??
            (canGenerate
              ? undefined
              : requiresLargeRunConfirm && !largeRunConfirmed
                ? 'Confirm the larger run first.'
                : 'Wait for an estimate of a scope with controls.')
          "
          data-testid="scope-generate"
          >Generate</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
