<template>
  <Dialog v-model:open="visible" title="Share this implementation" size="l">
    <Stack gap="4">
      <Stack gap="1">
        <Text as="span" variant="label"
          >{{ controlId }} · Statement {{ statementId }}</Text
        >
        <Text v-if="statementText" variant="caption">{{ statementText }}</Text>
      </Stack>
      <DataState
        v-if="loading || (stepError && stepError.step === 'load')"
        :status="loading ? 'loading' : 'error'"
        subject="what this system shares"
        skeleton="text"
        @retry="reload"
      />
      <form v-else-if="ready" novalidate @submit.prevent="share">
        <Stack gap="5">
          <Panel
            title="What this system provides"
            description="What other systems get when they inherit this. Leave it empty to share the whole implementation."
            :level="3"
          >
            <Stack gap="3">
              <Text v-if="!providedDrafts.length" variant="caption"
                >Nothing listed: the whole implementation is shared as “{{
                  fullScopePreview
                }}”.</Text
              >
              <Stack
                v-for="(entry, index) in providedDrafts"
                :key="entry.uuid ?? `new-provided-${index}`"
                gap="1"
              >
                <Cluster justify="between" gap="2" align="start">
                  <FormField :label="`Capability ${index + 1}`">
                    <Textarea v-model="entry.description" :rows="2" />
                  </FormField>
                  <IconButton
                    icon="close"
                    :label="`Remove capability ${index + 1}`"
                    @click="removeProvided(index)"
                  />
                </Cluster>
              </Stack>
              <div>
                <Button icon="add" size="sm" @click="addProvided"
                  >Add a capability</Button
                >
              </div>
            </Stack>
          </Panel>
          <Panel
            title="What consumers stay responsible for"
            description="Anything another system must still do itself."
            :level="3"
          >
            <Stack gap="3">
              <Stack
                v-for="(entry, index) in responsibilityDrafts"
                :key="entry.uuid ?? `new-responsibility-${index}`"
                gap="2"
              >
                <Cluster justify="between" gap="2" align="start">
                  <FormField :label="`Responsibility ${index + 1}`">
                    <Textarea v-model="entry.description" :rows="2" />
                  </FormField>
                  <IconButton
                    icon="close"
                    :label="`Remove responsibility ${index + 1}`"
                    @click="removeResponsibility(index)"
                  />
                </Cluster>
                <FormField v-if="providedDrafts.length > 1" label="Applies to">
                  <Select
                    :model-value="String(entry.providedIndex)"
                    :options="appliesToOptions"
                    @update:model-value="
                      (value: string) => (entry.providedIndex = Number(value))
                    "
                  />
                </FormField>
              </Stack>
              <div>
                <Button icon="add" size="sm" @click="addResponsibility"
                  >Add a responsibility</Button
                >
              </div>
            </Stack>
          </Panel>
          <Panel
            title="Who can import this"
            description="This applies to everything this system shares, not just this statement."
            :level="3"
          >
            <Stack gap="3">
              <RadioGroup
                v-model="visibility"
                legend="Who can import"
                legend-hidden
                variant="segmented"
                :options="[
                  { value: 'anyone', label: 'Anyone' },
                  { value: 'selected', label: 'Only chosen systems' },
                ]"
              />
              <Text v-if="visibilityMode === 'anyone'" variant="caption"
                >Any other system in this workspace can import it.</Text
              >
              <CheckboxGroup
                v-else
                v-model="selectedSspIds"
                legend="Systems"
                :options="sspChoices"
              />
            </Stack>
          </Panel>
          <InlineMessage v-if="validationError" tone="error" title="Not shared"
            ><p>{{ validationError }}</p></InlineMessage
          >
          <InlineMessage
            v-if="stepError && stepError.step !== 'load'"
            tone="error"
            title="Not shared"
          >
            <p>{{ stepErrorCopy(stepError) }}</p>
            <template #actions>
              <Button :loading="saving" @click="share">Retry</Button>
            </template>
          </InlineMessage>
          <Cluster justify="end" gap="2">
            <Button @click="visible = false">Cancel</Button>
            <Button
              variant="primary"
              type="submit"
              :loading="saving"
              :disabled-reason="shareDenied"
              >Share</Button
            >
          </Cluster>
        </Stack>
      </form>
    </Stack>
  </Dialog>
</template>

<script setup lang="ts">
/**
 * Sharing a statement's implementation with other systems: what this system provides (or the
 * whole implementation), what consumers stay responsible for (each tied to a capability when
 * there are several), and who may import it (anyone, or chosen systems). The script is the
 * classic dialog's.
 */
import Button from '@/ds/components/Button/Button.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import RadioGroup from '@/ds/components/RadioGroup/RadioGroup.vue';
import Select from '@/ds/components/Select/Select.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { usePermissions } from '@/composables/usePermissions';
import { computed, ref, watch } from 'vue';
import { useToast } from '@/ds/toasts';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import {
  fullScopeProvidedDescription,
  stepErrorCopy,
  useStatementExport,
  type ProvidedDraft,
  type ResponsibilityDraft,
} from '@/composables/useStatementExport';

const props = defineProps<{
  sspId: string;
  sspTitle: string;
  controlId: string;
  // The OSCAL part id (e.g. "ac-2_smt.a") — the composable resolves the uuids.
  statementId: string;
  statementText?: string;
  // Optional anchor hint when editing a specific rollup row.
  byComponentUuid?: string;
}>();

const visible = defineModel<boolean>('visible', { default: false });

const emit = defineEmits<{
  saved: [];
}>();

const toast = useToast();

const { state, loading, saving, stepError, load, save } = useStatementExport(
  () => ({
    sspId: props.sspId,
    sspTitle: props.sspTitle,
    controlId: props.controlId,
    statementId: props.statementId,
    byComponentUuid: props.byComponentUuid,
  }),
);

const providedDrafts = ref<ProvidedDraft[]>([]);
const responsibilityDrafts = ref<ResponsibilityDraft[]>([]);
const visibilityMode = ref<'anyone' | 'selected'>('anyone');
const selectedSspIds = ref<string[]>([]);
const validationError = ref('');

const ready = computed(() => !loading.value && state.value !== null);

const fullScopePreview = computed(() =>
  fullScopeProvidedDescription(props.sspTitle),
);

const providedOptions = computed(() =>
  providedDrafts.value.map((entry, index) => ({
    index,
    label: entry.description.trim() || `Capability ${index + 1}`,
  })),
);

async function reload() {
  const loaded = await load();
  if (!loaded || !state.value) return;
  providedDrafts.value = state.value.provided.map((p) => ({ ...p }));
  responsibilityDrafts.value = state.value.responsibilities.map((r) => ({
    ...r,
  }));
  selectedSspIds.value = [...state.value.allowedSspIds];
  visibilityMode.value = state.value.allowedSspIds.length
    ? 'selected'
    : 'anyone';
  validationError.value = '';
}

// immediate: the dialog is often mounted (v-if) at the same moment it is opened, so the
// first "open" would otherwise never trip the watcher.
watch(
  visible,
  (isOpen) => {
    if (isOpen) {
      void reload();
    }
  },
  { immediate: true },
);

function addProvided() {
  providedDrafts.value.push({ description: '' });
}

function removeProvided(index: number) {
  providedDrafts.value.splice(index, 1);
  // Responsibilities link to provided blocks positionally, so every index above the
  // removed one shifts left. Decrementing is not cosmetic: without it a surviving link
  // keeps its old index and silently resolves to the *next* capability.
  for (const entry of responsibilityDrafts.value) {
    if (entry.providedIndex > index) {
      entry.providedIndex--;
    } else if (entry.providedIndex === index) {
      entry.providedIndex = 0;
    }
    if (entry.providedIndex >= providedDrafts.value.length) {
      entry.providedIndex = Math.max(providedDrafts.value.length - 1, 0);
    }
  }
}

function addResponsibility() {
  responsibilityDrafts.value.push({ description: '', providedIndex: 0 });
}

function removeResponsibility(index: number) {
  responsibilityDrafts.value.splice(index, 1);
}

async function share() {
  if (saving.value) return;
  validationError.value = '';

  const provided = providedDrafts.value.filter((p) => p.description.trim());
  const responsibilities = responsibilityDrafts.value.filter((r) =>
    r.description.trim(),
  );
  // An entry that exists but was blanked out is ambiguous — make the user either write it
  // or remove it, instead of silently deleting.
  if (
    provided.length !== providedDrafts.value.length ||
    responsibilities.length !== responsibilityDrafts.value.length
  ) {
    validationError.value =
      'Some entries are empty. Write a description or remove them.';
    return;
  }
  if (visibilityMode.value === 'selected' && !selectedSspIds.value.length) {
    validationError.value =
      'Select at least one system, or switch visibility to “Anyone”.';
    return;
  }

  const saved = await save({
    provided: providedDrafts.value,
    responsibilities: responsibilityDrafts.value,
    allowedSspIds:
      visibilityMode.value === 'selected' ? selectedSspIds.value : [],
  });
  if (!saved) return;

  toast.add({
    severity: 'success',
    summary: 'Implementation shared',
    detail: state.value?.alreadyPublished
      ? 'Other systems can now import it. Existing importers will be notified of the update.'
      : 'Other systems can now import it.',
    life: 4000,
  });
  visible.value = false;
  emit('saved');
}
const { can } = usePermissions();
const shareDenied = computed(() =>
  can(RESOURCES.SSP, ACTIONS.UPDATE)
    ? undefined
    : "Your access doesn't include changing this system's sharing.",
);
const appliesToOptions = computed(() =>
  providedOptions.value.map((o) => ({
    value: String(o.index),
    label: o.label,
  })),
);
const visibility = computed({
  get: () => visibilityMode.value,
  set: (value: string) =>
    (visibilityMode.value = value as 'anyone' | 'selected'),
});
const sspChoices = computed(() =>
  (state.value?.sspOptions ?? []).map((o) => ({ value: o.id, label: o.label })),
);
</script>
