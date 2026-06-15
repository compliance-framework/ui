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
        />
      </div>

      <div>
        <label class="inline-block pb-2">Evidence label sets</label>
        <MultiSelect
          v-model="selectedLabelSetHashes"
          :options="labelSets"
          optionLabel="hash"
          optionValue="hash"
          display="chip"
          filter
          class="w-full"
          placeholder="All label sets"
        >
          <template #option="{ option }">
            <div class="flex flex-wrap items-center gap-2">
              <Chip
                v-for="label in formatLabelSet(option.labels)"
                :key="label"
                :label="label"
              />
              <span class="text-sm text-zinc-500">
                {{ option.evidenceCount }} evidence
              </span>
            </div>
          </template>
        </MultiSelect>
      </div>

      <label class="flex items-center gap-2">
        <Checkbox v-model="supersedePending" binary />
        <span>Replace pending suggestions in this scope</span>
      </label>

      <Message
        v-if="ceilingError"
        severity="error"
        variant="outlined"
        data-testid="scope-ceiling"
      >
        {{ ceilingError }}
      </Message>
      <Message
        v-else-if="requiresLargeRunConfirm"
        severity="warn"
        variant="outlined"
        data-testid="scope-warning"
      >
        This will make {{ plannedCalls }} AI calls covering
        {{ selectedControls.length }} controls x
        {{ selectedLabelSetHashes.length }} label-sets. These run as queued
        background jobs and may take a while and incur API costs.
      </Message>
      <Message v-else severity="info" variant="outlined">
        {{ plannedCalls }} AI calls covering
        {{ selectedControls.length }} controls x
        {{ selectedLabelSetHashes.length }} label-sets.
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
import { computed, ref, watch } from 'vue';
import Checkbox from 'primevue/checkbox';
import Chip from '@/volt/Chip.vue';
import Dialog from '@/volt/Dialog.vue';
import Message from '@/volt/Message.vue';
import MultiSelect from '@/volt/MultiSelect.vue';
import type {
  DashboardSuggestionLabelSet,
  GenerateDashboardSuggestionsPayload,
} from './dashboard-suggestions';
import { formatLabelSet } from './dashboard-suggestions';

interface ControlOption {
  label: string;
  value: string;
}

const props = defineProps<{
  visible: boolean;
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
const warningThreshold = 25;

const modelVisible = computed({
  get: () => props.visible,
  set: (visible: boolean) => emit('update:visible', visible),
});

const plannedCalls = computed(
  () => selectedControls.value.length * selectedLabelSetHashes.value.length,
);
const requiresLargeRunConfirm = computed(
  () => plannedCalls.value > warningThreshold,
);
const canGenerate = computed(
  () =>
    plannedCalls.value > 0 &&
    !props.ceilingError &&
    (!requiresLargeRunConfirm.value || largeRunConfirmed.value),
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
    emit('scope-change');
  },
  { deep: true },
);

watch([plannedCalls, modelVisible], () => {
  largeRunConfirmed.value = false;
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
</script>
