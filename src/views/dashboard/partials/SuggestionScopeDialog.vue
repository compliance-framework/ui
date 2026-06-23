<template>
  <Dialog
    v-model:visible="modelVisible"
    modal
    header="Generate suggestions"
    size="lg"
  >
    <div class="flex flex-col gap-5">
      <div>
        <label class="inline-block pb-2">Controls</label>
        <MultiSelect
          v-model="selectedControls"
          :options="controls"
          optionLabel="label"
          optionValue="value"
          display="chip"
          filter
          class="w-full"
          placeholder="All controls"
        >
          <template #option="{ option }">
            <div class="flex flex-col gap-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">
                  {{
                    option.controlId && option.title
                      ? `${option.controlId} - ${option.title}`
                      : option.label
                  }}
                </span>
                <Chip
                  v-for="profileTitle in option.profileTitles ?? []"
                  :key="profileTitle"
                  :label="profileTitle"
                />
              </div>
              <span
                v-if="option.catalogTitle"
                class="text-xs text-gray-500 dark:text-slate-400"
              >
                {{ option.catalogTitle }}
              </span>
            </div>
          </template>
        </MultiSelect>
      </div>

      <div>
        <label class="inline-block pb-2">Evidence to analyze</label>
        <p class="pb-2 text-sm text-gray-500 dark:text-slate-400">
          Restrict which evidence feeds the suggestions with label conditions
          (all conditions must match). Leave empty to consider all evidence.
        </p>
        <LabelConditionBuilder
          v-model="conditions"
          :ssp-id="sspId"
          :keys="keyNames"
          add-label="Add condition"
          testid="evidence-condition"
        />
      </div>

      <label class="flex items-center gap-2">
        <Checkbox v-model="supersedePending" binary />
        <span>Replace pending suggestions in this scope</span>
      </label>

      <div
        class="flex flex-col gap-4 border-t border-gray-200 pt-4 dark:border-slate-700"
      >
        <h3 class="text-sm font-semibold text-gray-700 dark:text-slate-200">
          Suggestion constraints
        </h3>
        <div>
          <label class="inline-block pb-2">Scope preset</label>
          <Select
            v-model="scopePreset"
            :options="scopePresetOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            data-testid="scope-preset"
          />
        </div>

        <div>
          <label class="inline-block pb-2">Required labels</label>
          <p class="pb-2 text-sm text-gray-500 dark:text-slate-400">
            Only suggest filters that include these labels. Leave the value
            blank to require the key with any value.
          </p>
          <LabelConditionBuilder
            v-model="mandatoryRows"
            :ssp-id="sspId"
            :keys="keyNames"
            add-label="Add required label"
            value-placeholder="value (any if blank)"
            testid="required-label"
          />
        </div>

        <div>
          <label class="inline-block pb-2">Excluded labels</label>
          <p class="pb-2 text-sm text-gray-500 dark:text-slate-400">
            Never include these labels in suggested filters. Leave the value
            blank to exclude the key with any value.
          </p>
          <LabelConditionBuilder
            v-model="excludedRows"
            :ssp-id="sspId"
            :keys="keyNames"
            add-label="Add excluded label"
            value-placeholder="value (any if blank)"
            testid="excluded-label"
          />
        </div>
      </div>

      <Message
        v-if="scopeError"
        severity="error"
        variant="outlined"
        data-testid="scope-ceiling"
      >
        {{ scopeError }}
      </Message>
      <Message
        v-else-if="previewLoading || !preview"
        severity="info"
        variant="outlined"
      >
        Loading suggestion estimate.
      </Message>
      <Message
        v-else-if="requiresLargeRunConfirm"
        severity="warn"
        variant="outlined"
        data-testid="scope-warning"
      >
        This will make {{ preview.plannedCalls }} AI calls covering
        {{ preview.controlCount }} controls x {{ preview.labelSetCount }}
        label-sets. These run as queued background jobs and may take a while and
        incur API costs.
      </Message>
      <Message v-else severity="info" variant="outlined">
        {{ preview.plannedCalls }} AI calls covering
        {{ preview.controlCount }} controls x {{ preview.labelSetCount }}
        label-sets.
      </Message>

      <label
        v-if="requiresLargeRunConfirm"
        class="flex items-center gap-2"
        data-testid="scope-confirm-large"
      >
        <Checkbox v-model="largeRunConfirmed" binary />
        <span>Confirm this larger generation run</span>
      </label>
    </div>

    <template #footer>
      <SecondaryButton @click="modelVisible = false">Cancel</SecondaryButton>
      <PrimaryButton
        :disabled="
          !canGenerate ||
          generating ||
          !can(RESOURCES.DASHBOARD_SUGGESTION, ACTIONS.CREATE)
        "
        v-tooltip.top="{
          value: permissionTooltip(
            RESOURCES.DASHBOARD_SUGGESTION,
            ACTIONS.CREATE,
          ),
          disabled: can(RESOURCES.DASHBOARD_SUGGESTION, ACTIONS.CREATE),
        }"
        @click="submit"
        data-testid="scope-generate"
      >
        Generate
      </PrimaryButton>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import Checkbox from 'primevue/checkbox';
import Chip from '@/volt/Chip.vue';
import Dialog from '@/volt/Dialog.vue';
import Message from '@/volt/Message.vue';
import MultiSelect from '@/volt/MultiSelect.vue';
import Select from '@/volt/Select.vue';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import type {
  DashboardSuggestionConstraints,
  DashboardSuggestionsPreview,
  DashboardSuggestionLabelKey,
  GenerateDashboardSuggestionsPayload,
  LabelSelector,
} from './dashboard-suggestions';
import {
  buildLabelFilter,
  buildPreviewDashboardSuggestionsEndpoint,
  type LabelConditionRow,
} from './dashboard-suggestions';
import LabelConditionBuilder from './LabelConditionBuilder.vue';
import type { DataResponse } from '@/stores/types';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can, permissionTooltip } = usePermissions();

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
  visible: boolean;
  sspId: string;
  controls: ControlOption[];
  labelKeys: DashboardSuggestionLabelKey[];
  generating?: boolean;
  ceilingError?: string;
}>();

const emit = defineEmits<{
  'update:visible': [visible: boolean];
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

const modelVisible = computed({
  get: () => props.visible,
  set: (visible: boolean) => emit('update:visible', visible),
});

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
