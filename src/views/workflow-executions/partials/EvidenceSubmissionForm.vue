<template>
  <div
    class="p-4 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50/50 dark:bg-blue-900/10"
  >
    <h4 class="text-sm font-medium text-gray-900 dark:text-slate-200 mb-2">
      Add Evidence
    </h4>
    <p class="text-xs text-gray-600 dark:text-slate-400 mb-4">
      Evidence will be submitted when you complete the step
    </p>

    <div class="space-y-4">
      <!-- Evidence Type Selector -->
      <div>
        <Label for="evidenceType" required>Evidence Type</Label>
        <Select
          id="evidenceType"
          v-model="evidenceForm.type"
          :options="availableEvidenceTypes"
          placeholder="Select evidence type"
          class="w-full"
        />
      </div>

      <!-- File Upload (for document, screenshot evidence) -->
      <div v-if="isFileEvidenceType">
        <Label for="file" required>Upload File</Label>
        <input
          id="file"
          type="file"
          multiple
          @change="handleFileChange"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
          class="w-full px-3 py-2 border border-ccf-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200"
        />
        <small class="text-gray-500 dark:text-slate-400">
          Supported: PDF, Word, Images (max 10MB per file, multiple files
          allowed)
        </small>
        <div v-if="selectedFiles.length > 0" class="mt-2 space-y-1">
          <div class="text-sm text-green-600 dark:text-green-400">
            <i class="pi pi-check-circle mr-1"></i>
            {{ selectedFiles.length }} file(s) selected:
          </div>
          <div
            v-for="file in selectedFiles"
            :key="file.name"
            class="text-xs text-gray-600 dark:text-slate-400 ml-4"
          >
            • {{ file.name }} ({{ formatFileSize(file.size) }})
          </div>
        </div>
      </div>

      <!-- Attestation Text (for attestation evidence) -->
      <div v-if="isAttestationEvidenceType">
        <Label for="attestation" required>Attestation Text</Label>
        <Textarea
          id="attestation"
          v-model="evidenceForm.attestationText"
          rows="4"
          placeholder="Enter your attestation or confirmation statement..."
          class="w-full"
        />
        <small class="text-gray-500 dark:text-slate-400">
          Provide a written statement confirming completion of this step
        </small>
      </div>

      <!-- Link URL (for link evidence) -->
      <div v-if="isLinkEvidenceType">
        <Label for="linkUrl" required>Link URL</Label>
        <InputText
          id="linkUrl"
          v-model="evidenceForm.linkUrl"
          type="url"
          placeholder="https://..."
          class="w-full"
        />
        <small class="text-gray-500 dark:text-slate-400">
          Provide a link to external evidence or documentation
        </small>
      </div>

      <!-- Error Message -->
      <Message v-if="submitError" severity="error">
        {{ submitError }}
      </Message>

      <!-- Add Evidence Button -->
      <PrimaryButton
        @click="handleSubmit"
        :disabled="isSubmitting || !canSubmit"
        class="w-full"
      >
        <i v-if="isSubmitting" class="pi pi-spin pi-spinner mr-2"></i>
        <i v-else class="pi pi-plus mr-2"></i>
        Add Evidence
      </PrimaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type {
  StepExecution,
  EvidenceType,
  StepExecutionEvidenceSubmit,
} from '@/types/workflows';
import Label from '@/volt/Label.vue';
import Select from '@/volt/Select.vue';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import Message from '@/volt/Message.vue';

const props = defineProps<{
  step: StepExecution;
  evidenceRequirements: string[];
}>();

const emit = defineEmits<{
  'evidence-submitted': [evidence: StepExecutionEvidenceSubmit];
}>();

// No longer using submitEvidence from composable - evidence is collected locally

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

// Get evidence types from requirements, or allow all common types
const availableEvidenceTypes = computed(() => {
  const allTypes: EvidenceType[] = [
    'document',
    'attestation',
    'screenshot',
    'link',
    'text',
  ];

  if (props.evidenceRequirements.length > 0) {
    return props.evidenceRequirements;
  }

  return allTypes;
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

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    const files = Array.from(target.files);

    // Validate each file size (10MB max)
    const oversizedFiles = files.filter((file) => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      submitError.value = `The following files exceed 10MB limit: ${oversizedFiles.map((f) => f.name).join(', ')}`;
      selectedFiles.value = [];
      return;
    }

    selectedFiles.value = files;
    submitError.value = '';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

    // Clear file input
    const fileInput = document.getElementById('file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  } catch (error) {
    submitError.value =
      error instanceof Error ? error.message : 'Failed to collect evidence';
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
