<script setup lang="ts">
import { computed, ref } from 'vue';
import PageCard from '@/components/PageCard.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Button from '@/volt/Button.vue';
import Badge from '@/volt/Badge.vue';
import Message from '@/volt/Message.vue';
import {
  useWorkflowImport,
  type WorkflowImportData,
  type WorkflowImportFileResult,
  type WorkflowImportSummary,
} from '@/composables/workflows/useWorkflowImport';
import {
  WORKFLOW_IMPORT_MAX_FILES,
  WORKFLOW_IMPORT_MAX_FILE_SIZE_BYTES,
  WORKFLOW_IMPORT_MAX_FILE_SIZE_MB,
} from '@/composables/workflows/workflowImportLimits';

const fileInput = ref<HTMLInputElement>();
const selectedFiles = ref<File[]>([]);
const importing = ref(false);
const results = ref<WorkflowImportData | null>(null);
const pageError = ref('');

const { importWorkflows } = useWorkflowImport();

const summaryFields: Array<{
  key: keyof WorkflowImportSummary;
  label: string;
}> = [
  { key: 'definitionsCreated', label: 'Definitions created' },
  { key: 'definitionsUpdated', label: 'Definitions updated' },
  { key: 'steps', label: 'Steps' },
  { key: 'dependencies', label: 'Dependencies' },
  { key: 'controlRelationships', label: 'Control relationships' },
  { key: 'instances', label: 'Instances' },
  { key: 'roleAssignments', label: 'Role assignments' },
  { key: 'skipped', label: 'Skipped' },
  { key: 'failed', label: 'Failed' },
];

const validationMessages = computed(() => {
  const messages: string[] = [];

  if (selectedFiles.value.length > WORKFLOW_IMPORT_MAX_FILES) {
    messages.push(
      `Select at most ${WORKFLOW_IMPORT_MAX_FILES} files per import.`,
    );
  }

  const oversizedFiles = selectedFiles.value.filter(
    (file) => file.size > WORKFLOW_IMPORT_MAX_FILE_SIZE_BYTES,
  );
  if (oversizedFiles.length) {
    messages.push(
      `Each file must be ${WORKFLOW_IMPORT_MAX_FILE_SIZE_MB} MB or smaller. Remove: ${oversizedFiles
        .map((file) => file.name)
        .join(', ')}.`,
    );
  }

  return messages;
});

const canSubmit = computed(
  () =>
    selectedFiles.value.length > 0 &&
    validationMessages.value.length === 0 &&
    !importing.value,
);

const resultSeverity = computed(() => {
  if (!results.value) return 'info';
  if (results.value.successfulFiles === 0) return 'error';
  if (results.value.failedFiles > 0 || results.value.summary.failed > 0) {
    return 'warn';
  }
  return 'success';
});

function onFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  selectedFiles.value = target.files ? Array.from(target.files) : [];
  results.value = null;
  pageError.value = '';
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1);
  results.value = null;
  pageError.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

function clearFiles() {
  selectedFiles.value = [];
  results.value = null;
  pageError.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function fileStatusLabel(result: WorkflowImportFileResult): string {
  if (!result.success) return 'Failed';
  if (result.summary.failed > 0) return 'Processed with failures';
  return 'Succeeded';
}

function fileStatusSeverity(
  result: WorkflowImportFileResult,
): 'success' | 'warn' | 'danger' {
  if (!result.success) return 'danger';
  if (result.summary.failed > 0) return 'warn';
  return 'success';
}

async function submitImport() {
  if (!selectedFiles.value.length) {
    pageError.value = 'Select at least one workflow JSON file to import.';
    return;
  }

  if (validationMessages.value.length) {
    pageError.value = validationMessages.value.join(' ');
    return;
  }

  importing.value = true;
  pageError.value = '';
  results.value = null;

  try {
    results.value = await importWorkflows(selectedFiles.value);
  } catch (error) {
    pageError.value =
      error instanceof Error ? error.message : 'Failed to import workflows.';
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <PageCard>
    <div class="space-y-5">
      <div
        class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Import workflows
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-slate-400">
            Upload SOC 2 CCF workflow seed JSON files.
          </p>
        </div>
        <Badge severity="info">Admin</Badge>
      </div>

      <div
        class="rounded-md border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-600"
      >
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          multiple
          class="hidden"
          data-testid="workflow-file-input"
          @change="onFileSelect"
        />
        <div class="flex flex-col items-center justify-center gap-2">
          <i class="pi pi-upload text-2xl text-gray-400"></i>
          <p class="text-sm text-gray-600 dark:text-slate-400">
            Select up to {{ WORKFLOW_IMPORT_MAX_FILES }} workflow JSON files,
            {{ WORKFLOW_IMPORT_MAX_FILE_SIZE_MB }} MB each.
          </p>
          <button
            type="button"
            class="text-sm font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
            @click="fileInput?.click()"
          >
            Browse files
          </button>
        </div>
      </div>

      <div v-if="selectedFiles.length" class="space-y-2">
        <div
          class="text-sm font-medium text-gray-700 dark:text-slate-300"
          data-testid="workflow-selected-count"
        >
          Selected {{ selectedFiles.length }} file(s)
        </div>
        <ul
          class="divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-slate-700 dark:border-slate-700"
        >
          <li
            v-for="(file, index) in selectedFiles"
            :key="`${file.name}-${file.size}-${index}`"
            class="flex items-center justify-between gap-3 px-3 py-2"
          >
            <div class="min-w-0">
              <p
                class="truncate text-sm font-medium text-gray-900 dark:text-slate-100"
              >
                {{ file.name }}
              </p>
              <p class="text-xs text-gray-500 dark:text-slate-400">
                {{ formatFileSize(file.size) }}
              </p>
            </div>
            <Button
              type="button"
              text
              severity="secondary"
              :aria-label="`Remove ${file.name}`"
              @click="removeFile(index)"
            >
              <i class="pi pi-times"></i>
            </Button>
          </li>
        </ul>
      </div>

      <Message
        v-for="message in validationMessages"
        :key="message"
        severity="warn"
        data-testid="workflow-validation-message"
      >
        {{ message }}
      </Message>

      <Message v-if="pageError" severity="error" data-testid="workflow-error">
        {{ pageError }}
      </Message>

      <div class="flex flex-wrap gap-2">
        <PrimaryButton
          type="button"
          :disabled="!canSubmit"
          :loading="importing"
          data-testid="workflow-import-submit"
          @click="submitImport"
        >
          {{ importing ? 'Importing...' : 'Import workflows' }}
        </PrimaryButton>
        <SecondaryButton
          type="button"
          :disabled="selectedFiles.length === 0 || importing"
          @click="clearFiles"
        >
          Clear
        </SecondaryButton>
      </div>

      <div v-if="results" class="space-y-4" data-testid="workflow-results">
        <Message :severity="resultSeverity">
          <div class="text-sm">
            <p class="font-semibold">
              {{ results.successfulFiles }} of {{ results.totalFiles }} file(s)
              processed successfully
            </p>
            <p v-if="results.failedFiles" class="mt-1">
              {{ results.failedFiles }} file(s) failed. Review the rows below.
            </p>
          </div>
        </Message>

        <div
          class="grid grid-cols-2 border-y border-gray-200 sm:grid-cols-3 lg:grid-cols-5 dark:border-slate-700"
          data-testid="workflow-aggregate-summary"
        >
          <div
            v-for="field in summaryFields"
            :key="field.key"
            class="px-3 py-2"
          >
            <div class="text-xs text-gray-500 dark:text-slate-400">
              {{ field.label }}
            </div>
            <div class="text-base font-semibold dark:text-slate-100">
              {{ results.summary[field.key] }}
            </div>
          </div>
        </div>

        <div
          class="overflow-x-auto rounded-md border border-gray-200 dark:border-slate-700"
        >
          <table class="w-full min-w-[760px] text-sm dark:text-slate-300">
            <thead class="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th class="px-3 py-2 text-left font-medium">File</th>
                <th class="px-3 py-2 text-left font-medium">Status</th>
                <th class="px-3 py-2 text-left font-medium">Message</th>
                <th
                  v-for="field in summaryFields"
                  :key="field.key"
                  class="px-3 py-2 text-right font-medium"
                >
                  {{ field.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(result, index) in results.results"
                :key="`${result.filename}-${index}`"
                class="border-t border-gray-200 dark:border-slate-700"
                :class="{
                  'bg-red-50/60 dark:bg-red-950/20': !result.success,
                }"
              >
                <td class="px-3 py-2 font-medium">{{ result.filename }}</td>
                <td class="px-3 py-2">
                  <Badge :severity="fileStatusSeverity(result)">
                    {{ fileStatusLabel(result) }}
                  </Badge>
                </td>
                <td class="max-w-sm px-3 py-2">
                  <span class="break-words">{{ result.message }}</span>
                </td>
                <td
                  v-for="field in summaryFields"
                  :key="field.key"
                  class="px-3 py-2 text-right tabular-nums"
                >
                  {{ result.summary[field.key] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </PageCard>
</template>
