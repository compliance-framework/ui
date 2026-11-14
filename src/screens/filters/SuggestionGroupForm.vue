<script setup lang="ts">
/**
 * Editing a group of pending suggestions: the proposed filter's title and labels, which of its
 * controls to keep, and controls to add. Emits `save` with the edit. The script is the classic
 * dialog's.
 */
import { computed, ref, watch } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import {
  buildControlKey,
  type DashboardSuggestion,
  type EditDashboardSuggestionGroupPayload,
} from '@/views/dashboard/partials/dashboard-suggestions';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can } = usePermissions();
const updateDenied = computed(() =>
  can(RESOURCES.DASHBOARD_SUGGESTION, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include reviewing suggestions.",
);

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
  group: SuggestionGroup | null;
  controlOptions: ControlOption[];
  // Resolves a control's catalog UUID; falls back to the group's catalog id.
  resolveCatalogId?: (controlId: string) => string | undefined;
  saving?: boolean;
  // Server-side save error, surfaced inline so the dialog stays open on failure.
  error?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  save: [payload: EditDashboardSuggestionGroupPayload];
}>();

const title = ref('');
const labelRows = ref<LabelRow[]>([]);
const removeIds = ref<string[]>([]);
const addControlIds = ref<string[]>([]);

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

// Mounted only while its dialog is open, so it starts from the group each time.
watch(
  () => props.group?.hash,
  () => {
    if (!props.group) {
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

function toggleMember(id: string, keep: boolean) {
  if (keep) {
    removeIds.value = removeIds.value.filter((removeId) => removeId !== id);
  } else if (!removeIds.value.includes(id)) {
    removeIds.value = [...removeIds.value, id];
  }
}

// The controls kept, as checkboxes (all ticked to start): unticking one removes it.
const memberOptions = computed(() =>
  memberRows.value.map((member) => ({
    value: member.id,
    label: `${member.controlId} ${member.controlTitle ?? ''}`.trim(),
  })),
);
const keptIds = computed({
  get: () =>
    memberRows.value
      .map((member) => member.id)
      .filter((id) => !removeIds.value.includes(id)),
  set: (kept: string[]) => {
    for (const member of memberRows.value)
      toggleMember(member.id, kept.includes(member.id));
  },
});
const addChoices = computed(() =>
  addControlOptions.value.filter(
    (option) => !addControlIds.value.includes(option.value),
  ),
);
const addLabelOf = (value: string) =>
  props.controlOptions.find((option) => option.value === value)?.label ?? value;
const controlToAdd = ref('');
watch(controlToAdd, (value) => {
  if (!value) return;
  addControlIds.value = [...addControlIds.value, value];
  controlToAdd.value = '';
});

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

<template>
  <form novalidate @submit.prevent="submit">
    <Stack gap="5">
      <FormField label="Title"><TextInput v-model="title" /></FormField>
      <FieldList
        v-model="labelRows"
        legend="Filter labels"
        hint="The labels that define the evidence filter. They can include labels the evidence doesn't have yet."
        item-label="label"
        add-label="Add label"
        empty-text="No labels yet."
        :new-item="() => ({ key: '', value: '' })"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="Label"
              ><TextInput v-model="item.key"
            /></FormField>
            <FormField label="Value"
              ><TextInput v-model="item.value"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
      <CheckboxGroup
        v-if="memberOptions.length"
        v-model="keptIds"
        legend="Controls"
        hint="Untick a control to remove it from the group."
        :options="memberOptions"
      />
      <Stack gap="2">
        <Stack v-if="addControlIds.length" gap="1" as="ul">
          <li v-for="value in addControlIds" :key="value">
            <Cluster justify="between" gap="2">
              <Text as="span">{{ addLabelOf(value) }}</Text>
              <IconButton
                icon="close"
                :label="`Don't add ${value}`"
                @click="
                  addControlIds = addControlIds.filter((v) => v !== value)
                "
              />
            </Cluster>
          </li>
        </Stack>
        <FormField label="Add a control">
          <Combobox
            v-model="controlToAdd"
            :options="addChoices"
            placeholder="Control ID or title"
            empty-text="No other controls to add."
          />
        </FormField>
      </Stack>
      <InlineMessage v-if="error" tone="error" title="Not saved"
        ><p>{{ error }}</p></InlineMessage
      >
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button
          variant="primary"
          type="submit"
          :loading="saving"
          :disabled-reason="
            updateDenied ??
            (canSave ? undefined : 'Keep at least one label and one control.')
          "
          >Save changes</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
