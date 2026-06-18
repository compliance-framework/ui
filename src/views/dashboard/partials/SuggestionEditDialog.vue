<template>
  <Dialog
    v-model:visible="modelVisible"
    modal
    header="Edit suggestion group"
    size="lg"
  >
    <div class="flex flex-col gap-5">
      <div>
        <label class="inline-block pb-2" for="edit-title">Title</label>
        <InputText id="edit-title" v-model="title" class="w-full" />
      </div>

      <div>
        <label class="inline-block pb-2">Filter labels</label>
        <p class="pb-2 text-sm text-zinc-500 dark:text-slate-400">
          These key=value labels define the dashboard filter. You can add labels
          that are not present in the evidence.
        </p>
        <div class="flex flex-col gap-2">
          <div
            v-for="(row, index) in labelRows"
            :key="index"
            class="flex items-center gap-2"
          >
            <InputText
              v-model="row.key"
              placeholder="key"
              class="w-1/2"
              :data-testid="`edit-label-key-${index}`"
            />
            <span class="text-zinc-400">=</span>
            <InputText
              v-model="row.value"
              placeholder="value"
              class="w-1/2"
              :data-testid="`edit-label-value-${index}`"
            />
            <SecondaryButton
              type="button"
              aria-label="Remove label"
              @click="removeLabelRow(index)"
            >
              <i class="pi pi-trash" />
            </SecondaryButton>
          </div>
        </div>
        <SecondaryButton type="button" class="mt-2" @click="addLabelRow">
          Add label
        </SecondaryButton>
      </div>

      <div>
        <label class="inline-block pb-2">Controls</label>
        <div
          v-if="memberRows.length"
          class="flex flex-col gap-1 rounded-md border border-zinc-200 p-3 dark:border-slate-700"
        >
          <label
            v-for="member in memberRows"
            :key="member.id"
            class="flex items-center gap-2"
            :class="{ 'opacity-50': removeIds.includes(member.id) }"
          >
            <Checkbox
              :modelValue="!removeIds.includes(member.id)"
              binary
              @update:modelValue="
                (keep: boolean) => toggleMember(member.id, keep)
              "
            />
            <span class="font-medium">{{ member.controlId }}</span>
            <span class="text-sm text-zinc-500">{{ member.controlTitle }}</span>
          </label>
        </div>
        <div class="mt-2">
          <label class="inline-block pb-2 text-sm">Add controls</label>
          <MultiSelect
            v-model="addControlIds"
            :options="addControlOptions"
            optionLabel="label"
            optionValue="value"
            display="chip"
            filter
            class="w-full"
            placeholder="No controls to add"
          />
        </div>
      </div>

      <Message v-if="error" severity="error" variant="outlined">
        {{ error }}
      </Message>
    </div>

    <template #footer>
      <SecondaryButton @click="modelVisible = false">Cancel</SecondaryButton>
      <PrimaryButton :disabled="!canSave || saving" @click="submit">
        Save changes
      </PrimaryButton>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Checkbox from 'primevue/checkbox';
import Dialog from '@/volt/Dialog.vue';
import InputText from '@/volt/InputText.vue';
import Message from '@/volt/Message.vue';
import MultiSelect from '@/volt/MultiSelect.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import {
  buildControlKey,
  type DashboardSuggestion,
  type EditDashboardSuggestionGroupPayload,
} from './dashboard-suggestions';

interface ControlOption {
  label: string;
  value: string;
  controlId?: string;
}

interface SuggestionGroup {
  hash: string;
  labels: string[];
  suggestions: DashboardSuggestion[];
}

interface LabelRow {
  key: string;
  value: string;
}

const props = defineProps<{
  visible: boolean;
  group: SuggestionGroup | null;
  controlOptions: ControlOption[];
  // Resolves a control's catalog UUID; falls back to the group's catalog id.
  resolveCatalogId?: (controlId: string) => string | undefined;
  saving?: boolean;
  // Server-side save error, surfaced inline so the dialog stays open on failure.
  error?: string;
}>();

const emit = defineEmits<{
  'update:visible': [visible: boolean];
  save: [payload: EditDashboardSuggestionGroupPayload];
}>();

const title = ref('');
const labelRows = ref<LabelRow[]>([]);
const removeIds = ref<string[]>([]);
const addControlIds = ref<string[]>([]);

const modelVisible = computed({
  get: () => props.visible,
  set: (visible: boolean) => emit('update:visible', visible),
});

const groupCatalogId = computed(
  () => props.group?.suggestions[0]?.controlCatalogId ?? '',
);

const memberRows = computed(() =>
  (props.group?.suggestions ?? []).map((suggestion) => ({
    id: suggestion.id,
    controlId: suggestion.controlId,
    controlTitle: suggestion.controlTitle,
  })),
);

// Controls available to add: SSP controls not already covered by the group.
const addControlOptions = computed(() => {
  const existing = new Set(
    (props.group?.suggestions ?? []).map((suggestion) =>
      suggestion.controlId.toLowerCase(),
    ),
  );
  return props.controlOptions.filter(
    (option) => !existing.has((option.controlId ?? option.value).toLowerCase()),
  );
});

const canSave = computed(() => {
  if (!props.group) {
    return false;
  }
  // At least one kept member or one added control must remain.
  const keptCount = memberRows.value.filter(
    (member) => !removeIds.value.includes(member.id),
  ).length;
  return (
    cleanedLabelRows().length > 0 && keptCount + addControlIds.value.length > 0
  );
});

watch(
  () => [props.visible, props.group?.hash],
  () => {
    if (!props.visible || !props.group) {
      return;
    }
    const first = props.group.suggestions[0];
    title.value = first?.proposedFilterName ?? first?.targetFilterName ?? '';
    const labels = first?.proposedFilterLabelSet ?? first?.labelSet ?? {};
    labelRows.value = Object.entries(labels).map(([key, value]) => ({
      key,
      value,
    }));
    if (labelRows.value.length === 0) {
      labelRows.value = [{ key: '', value: '' }];
    }
    removeIds.value = [];
    addControlIds.value = [];
  },
  { immediate: true },
);

function addLabelRow() {
  labelRows.value.push({ key: '', value: '' });
}

function removeLabelRow(index: number) {
  labelRows.value.splice(index, 1);
}

function toggleMember(id: string, keep: boolean) {
  if (keep) {
    removeIds.value = removeIds.value.filter((removeId) => removeId !== id);
  } else if (!removeIds.value.includes(id)) {
    removeIds.value = [...removeIds.value, id];
  }
}

function cleanedLabelRows(): LabelRow[] {
  return labelRows.value
    .map((row) => ({ key: row.key.trim(), value: row.value.trim() }))
    .filter((row) => row.key.length > 0);
}

function submit() {
  if (!props.group || !canSave.value) {
    return;
  }
  const labelSet: Record<string, string> = {};
  for (const row of cleanedLabelRows()) {
    labelSet[row.key] = row.value;
  }

  const addControlKeys = addControlIds.value.map((controlId) => {
    const catalogId =
      props.resolveCatalogId?.(controlId) || groupCatalogId.value;
    return buildControlKey(catalogId, controlId);
  });

  emit('save', {
    ids: props.group.suggestions.map((suggestion) => suggestion.id),
    proposedFilterName: title.value.trim() || undefined,
    proposedFilterLabelSet: labelSet,
    addControlKeys: addControlKeys.length > 0 ? addControlKeys : undefined,
    removeIds: removeIds.value.length > 0 ? [...removeIds.value] : undefined,
  });
}
</script>
