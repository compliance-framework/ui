<script setup lang="ts">
/**
 * Add evidence to a step (in the step panel): its type (from what the step asks for, else any
 * type), then files, an attestation or a link. Evidence is collected, not sent: the panel submits
 * it with the step on completion.
 */
import { ref, computed } from 'vue';
import type {
  StepExecution,
  EvidenceType,
  EvidenceRequirement,
  StepExecutionEvidenceSubmit,
} from '@/types/workflows';
import Button from '@/ds/components/Button/Button.vue';
import FileField from '@/ds/components/FileField/FileField.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can, permissionTooltip } = usePermissions();

const props = defineProps<{
  step: StepExecution;
  evidenceRequirements: EvidenceRequirement[];
}>();

const emit = defineEmits<{
  'evidence-submitted': [evidence: StepExecutionEvidenceSubmit];
}>();

const evidenceForm = ref<{
  type: EvidenceType | '';
  attestationText: string;
  linkUrl: string;
}>({
  type: '',
  attestationText: '',
  linkUrl: '',
});

const selectedFiles = ref<File[]>([]);
const isSubmitting = ref(false);
const submitError = ref('');

const availableEvidenceTypes = computed(() => {
  const toOption = (type: EvidenceType, description?: string) => ({
    value: type,
    label: description || type,
  });

  if (props.evidenceRequirements.length > 0) {
    return props.evidenceRequirements.map((req) =>
      toOption(req.type, req.description),
    );
  }

  const allTypes: EvidenceType[] = [
    'document',
    'attestation',
    'screenshot',
    'link',
    'text',
  ];
  return allTypes.map((type) => toOption(type));
});

const isFileEvidenceType = computed(() => {
  return (
    evidenceForm.value.type === 'document' ||
    evidenceForm.value.type === 'screenshot'
  );
});

const isAttestationEvidenceType = computed(() => {
  return (
    evidenceForm.value.type === 'attestation' ||
    evidenceForm.value.type === 'text'
  );
});

const isLinkEvidenceType = computed(() => {
  return evidenceForm.value.type === 'link';
});

const screenshotAcceptTypes = '.png,.jpg,.jpeg,.gif,.webp';
const documentAcceptTypes = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp';

const fileAcceptTypes = computed(() => {
  return evidenceForm.value.type === 'screenshot'
    ? screenshotAcceptTypes
    : documentAcceptTypes;
});

const screenshotAllowedMimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

const canSubmit = computed(() => {
  if (!evidenceForm.value.type) return false;

  if (isFileEvidenceType.value && selectedFiles.value.length === 0)
    return false;
  if (
    isAttestationEvidenceType.value &&
    !evidenceForm.value.attestationText.trim()
  )
    return false;
  if (isLinkEvidenceType.value && !evidenceForm.value.linkUrl.trim())
    return false;

  return true;
});

const typeLabel = computed(
  () =>
    availableEvidenceTypes.value.find(
      (o) => o.value === evidenceForm.value.type,
    )?.label ?? 'evidence',
);
const addDenied = computed(() => {
  if (!can(RESOURCES.STEP_EXECUTION, ACTIONS.UPDATE))
    return (
      permissionTooltip(RESOURCES.STEP_EXECUTION, ACTIONS.UPDATE) ||
      "Your access doesn't include working on steps."
    );
  if (!evidenceForm.value.type) return 'Choose the type of evidence first.';
  return canSubmit.value ? undefined : `Add the ${typeLabel.value} first.`;
});

function handleFiles(files: File[]) {
  selectedFiles.value = [];
  if (files.length === 0) return;
  const oversized = files.filter((file) => file.size > 10 * 1024 * 1024);
  if (oversized.length > 0) {
    submitError.value = `These files are over 10 MB: ${oversized.map((f) => f.name).join(', ')}`;
    return;
  }
  if (evidenceForm.value.type === 'screenshot') {
    const notImages = files.filter(
      (file) => !screenshotAllowedMimeTypes.has(file.type),
    );
    if (notImages.length > 0) {
      submitError.value = `A screenshot must be a PNG, JPG, GIF or WebP image: ${notImages.map((f) => f.name).join(', ')}`;
      return;
    }
  }
  selectedFiles.value = files;
  submitError.value = '';
}

async function handleSubmit() {
  if (!canSubmit.value) return;

  isSubmitting.value = true;
  submitError.value = '';

  try {
    // Handle file uploads - create separate evidence for each file
    if (selectedFiles.value.length > 0) {
      for (const file of selectedFiles.value) {
        const fileData = await fileToBase64(file);

        const evidence: StepExecutionEvidenceSubmit = {
          evidenceType: evidenceForm.value.type as EvidenceType,
          file: file,
          fileName: file.name,
          fileData,
          fileSize: file.size,
        };

        // Emit each evidence item to parent component
        emit('evidence-submitted', evidence);
      }
    } else {
      // Handle non-file evidence (attestation, link)
      const evidence: StepExecutionEvidenceSubmit = {
        evidenceType: evidenceForm.value.type as EvidenceType,
        attestationText: evidenceForm.value.attestationText || undefined,
        linkUrl: evidenceForm.value.linkUrl || undefined,
      };

      // Emit the evidence to parent component
      emit('evidence-submitted', evidence);
    }

    // Reset form
    evidenceForm.value = {
      type: '',
      attestationText: '',
      linkUrl: '',
    };
    selectedFiles.value = [];
  } catch (error) {
    submitError.value =
      error instanceof Error
        ? error.message
        : 'The evidence could not be added.';
  } finally {
    isSubmitting.value = false;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}
</script>

<template>
  <Stack gap="4">
    <Stack gap="1">
      <Text as="span" variant="label">Add evidence</Text>
      <Text variant="caption"
        >It's submitted with the step when you complete it.</Text
      >
    </Stack>
    <FormField label="Evidence type" required>
      <Select
        v-model="evidenceForm.type"
        :options="availableEvidenceTypes"
        placeholder="Choose a type"
      />
    </FormField>
    <FormField
      v-if="isFileEvidenceType"
      label="Files"
      required
      :hint="
        evidenceForm.type === 'screenshot'
          ? 'PNG, JPG, GIF or WebP, up to 10 MB each.'
          : 'PDF, Word or images, up to 10 MB each.'
      "
    >
      <FileField
        multiple
        :accept="fileAcceptTypes"
        :files="selectedFiles"
        @update:files="handleFiles"
      />
    </FormField>
    <FormField
      v-if="isAttestationEvidenceType"
      label="Attestation"
      required
      hint="A written statement confirming this step is done."
    >
      <Textarea v-model="evidenceForm.attestationText" :rows="4" />
    </FormField>
    <FormField
      v-if="isLinkEvidenceType"
      label="Link"
      required
      hint="Where the evidence or documentation lives."
    >
      <TextInput
        v-model="evidenceForm.linkUrl"
        type="url"
        placeholder="https://"
      />
    </FormField>
    <InlineMessage v-if="submitError" tone="error" title="Not added">
      <p>{{ submitError }}</p>
    </InlineMessage>
    <div>
      <Button
        icon="add"
        :loading="isSubmitting"
        :disabled-reason="addDenied"
        @click="handleSubmit"
        >Add evidence</Button
      >
    </div>
  </Stack>
</template>
