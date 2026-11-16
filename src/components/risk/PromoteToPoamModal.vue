<template>
  <Dialog v-model:open="localVisible" title="Create mitigation" size="l">
    <form novalidate @submit.prevent="submit">
      <Stack gap="4">
        <Text>The risk moves from Investigating to Mitigating Planned.</Text>
        <FormField
          label="Mitigation plan title"
          hint="Leave blank to use the risk's title."
        >
          <TextInput
            v-model="form.title"
            :placeholder="riskTitle || undefined"
          />
        </FormField>
        <FormField label="Planned completion">
          <TextInput v-model="form.deadline" type="date" />
        </FormField>
        <FormField
          label="Resources required"
          hint="Optional, e.g. 3 engineer days"
        >
          <TextInput v-model="form.resourceRequired" />
        </FormField>
        <Stack
          v-if="templateMilestoneTitles && templateMilestoneTitles.length > 0"
          gap="2"
        >
          <Text as="span" variant="label"
            >Milestones from the remediation template</Text
          >
          <Stack gap="1" as="ol">
            <li v-for="(title, idx) in templateMilestoneTitles" :key="idx">
              <Text as="span">{{ title }}</Text>
            </li>
          </Stack>
        </Stack>
        <Text v-else variant="caption"
          >Milestones can be added to the POA&M item after it is created.</Text
        >
        <InlineMessage v-if="validationError" tone="error" title="Not created"
          ><p>{{ validationError }}</p></InlineMessage
        >
        <Cluster justify="end" gap="2">
          <Button @click="cancel">Cancel</Button>
          <Button variant="primary" type="submit" :loading="submitting"
            >Create mitigation</Button
          >
        </Cluster>
      </Stack>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
/** Creating a mitigation for a risk: a POA&M item (title, planned completion, resources) that moves the risk from Investigating to Mitigating Planned. Emits `submit`; the risk page saves it. The script is the classic dialog's. */
import Button from '@/ds/components/Button/Button.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { ref, watch } from 'vue';

// ─── Props ────────────────────────────────────────────────────────────────────

const props = defineProps<{
  /** Controls modal visibility via v-model:visible */
  visible: boolean;
  /** Whether the parent is currently submitting the promotion request */
  submitting: boolean;
  /** Risk title — used as placeholder for the POAM item title field */
  riskTitle?: string;
  /** Milestone titles derived from the risk's remediation template (read-only preview) */
  templateMilestoneTitles?: string[];
}>();

// ─── Emits ────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  /** Emitted when the user confirms the promotion */
  (
    event: 'submit',
    payload: {
      title?: string;
      deadline?: string;
      resourceRequired?: string;
    },
  ): void;
  /** Emitted when the user cancels */
  (event: 'update:visible', value: boolean): void;
}>();

// ─── Local state ──────────────────────────────────────────────────────────────

const localVisible = ref(props.visible);

const form = ref({
  title: 'Mitigation Plan to remediate risk',
  deadline: '',
  resourceRequired: '',
});

const validationError = ref('');

// ─── Watchers ─────────────────────────────────────────────────────────────────

watch(
  () => props.visible,
  (value) => {
    localVisible.value = value;
    if (value) resetForm();
  },
);

watch(localVisible, (value) => {
  emit('update:visible', value);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetForm() {
  form.value = {
    title: 'Mitigation Plan to remediate risk',
    deadline: '',
    resourceRequired: '',
  };
  validationError.value = '';
}

function cancel() {
  localVisible.value = false;
}

function submit() {
  validationError.value = '';

  const payload: {
    title?: string;
    deadline?: string;
    resourceRequired?: string;
  } = {};

  const trimmedTitle = form.value.title.trim();
  if (trimmedTitle) payload.title = trimmedTitle;

  if (form.value.deadline) {
    // Convert YYYY-MM-DD date input to ISO 8601 datetime string (end of day UTC).
    const parsed = new Date(`${form.value.deadline}T23:59:59Z`);
    if (Number.isNaN(parsed.getTime())) {
      validationError.value = 'Planned completion date is invalid.';
      return;
    }
    payload.deadline = parsed.toISOString();
  }

  const trimmedResource = form.value.resourceRequired.trim();
  if (trimmedResource) payload.resourceRequired = trimmedResource;

  emit('submit', payload);
}
</script>
