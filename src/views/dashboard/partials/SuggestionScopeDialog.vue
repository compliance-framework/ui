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
        <label class="inline-block pb-2">Evidence label sets</label>
        <MultiSelect
          v-model="selectedLabelSetHashes"
          :options="labelSetOptions"
          optionLabel="title"
          optionValue="hash"
          display="chip"
          filter
          class="w-full"
          placeholder="All label sets"
        >
          <template #option="{ option }">
            <div class="flex flex-col gap-1">
              <span class="font-medium">
                {{ option.title || getLabelSetTitle(option) }}
              </span>
              <div
                class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-slate-400"
              >
                <Chip
                  v-for="label in option.displayLabels"
                  :key="label"
                  :label="label"
                />
                <span v-if="option.hiddenLabelCount > 0">
                  {{ option.hiddenLabelCount }} more
                  {{ option.hiddenLabelCount === 1 ? 'label' : 'labels' }}
                </span>
              </div>
            </div>
          </template>
        </MultiSelect>
      </div>

      <label class="flex items-center gap-2">
        <Checkbox v-model="supersedePending" binary />
        <span>Replace pending suggestions in this scope</span>
      </label>

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
        :disabled="!canGenerate || generating"
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
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import type {
  DashboardSuggestionsPreview,
  DashboardSuggestionLabelSet,
  GenerateDashboardSuggestionsPayload,
} from './dashboard-suggestions';
import {
  buildPreviewDashboardSuggestionsEndpoint,
  formatVisibleLabelSet,
} from './dashboard-suggestions';
import type { DataResponse } from '@/stores/types';

interface ControlOption {
  label: string;
  value: string;
  controlId?: string;
  title?: string;
  catalogTitle?: string;
  profileTitles?: string[];
}

type LabelSetOption = DashboardSuggestionLabelSet & {
  title: string;
  displayLabels: string[];
  hiddenLabelCount: number;
};

// Max non-internal labels shown per label set before collapsing into a count.
const MAX_VISIBLE_LABELS = 5;

const props = defineProps<{
  visible: boolean;
  sspId: string;
  controls: ControlOption[];
  labelSets: DashboardSuggestionLabelSet[];
  generating?: boolean;
  ceilingError?: string;
}>();

const emit = defineEmits<{
  'update:visible': [visible: boolean];
  'scope-change': [];
  generate: [payload: GenerateDashboardSuggestionsPayload];
}>();

const selectedControls = ref<string[]>([]);
const selectedLabelSetHashes = ref<string[]>([]);
const supersedePending = ref(true);
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
const labelSetOptions = computed<LabelSetOption[]>(() =>
  props.labelSets.map((labelSet) => {
    const visibleLabels = formatVisibleLabelSet(labelSet.labels ?? {});
    return {
      ...labelSet,
      title: getLabelSetTitle(labelSet),
      displayLabels: visibleLabels.slice(0, MAX_VISIBLE_LABELS),
      hiddenLabelCount: Math.max(0, visibleLabels.length - MAX_VISIBLE_LABELS),
    };
  }),
);

watch(
  () => props.controls,
  (controls) => {
    selectedControls.value = controls.map((control) => control.value);
  },
  { immediate: true },
);

watch(
  () => props.labelSets,
  (labelSets) => {
    selectedLabelSetHashes.value = labelSets.map((labelSet) => labelSet.hash);
  },
  { immediate: true },
);

watch(
  [selectedControls, selectedLabelSetHashes],
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

watch([() => props.controls, () => props.labelSets], () => {
  schedulePreview();
});

function selectedScope(): GenerateDashboardSuggestionsPayload['scope'] {
  const scope: GenerateDashboardSuggestionsPayload['scope'] = {};
  if (selectedControls.value.length !== props.controls.length) {
    scope.controlKeys = selectedControls.value;
  }
  if (selectedLabelSetHashes.value.length !== props.labelSets.length) {
    scope.labelSetHashes = selectedLabelSetHashes.value;
  }
  return Object.keys(scope).length > 0 ? scope : undefined;
}

function submit() {
  if (!canGenerate.value) {
    return;
  }
  emit('generate', {
    supersedePending: supersedePending.value,
    scope: selectedScope(),
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
    const response = await axios.post<
      DataResponse<DashboardSuggestionsPreview>
    >(
      buildPreviewDashboardSuggestionsEndpoint(props.sspId),
      scope ? { scope } : {},
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

function getLabelSetTitle(labelSet: DashboardSuggestionLabelSet) {
  const sampleTitle = labelSet.sampleTitles?.find(
    (title) => title.trim().length > 0,
  );
  if (sampleTitle) {
    return sampleTitle;
  }

  const labelSummary = formatVisibleLabelSet(labelSet.labels ?? {}).join(', ');
  return labelSummary || labelSet.hash;
}
</script>
