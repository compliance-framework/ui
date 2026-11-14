<script setup lang="ts">
/**
 * Import → Workflows: SOC 2 CCF workflow seed files (JSON, up to the file count and size limits),
 * then an overall result with the records imported and a result per file. The import logic is
 * the classic panel's.
 */
import { computed, ref } from 'vue';
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
import { plural } from '@/ds/format';
import Button from '@/ds/components/Button/Button.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import FileField from '@/ds/components/FileField/FileField.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const selectedFiles = ref<File[]>([]);
const importing = ref(false);
const results = ref<WorkflowImportData | null>(null);
const pageError = ref('');

const { importWorkflows } = useWorkflowImport();

const summaryFields: Array<{
  key: keyof WorkflowImportSummary;
  label: string;
  /** How a file's count reads: one and many. */
  nouns: [string, string];
}> = [
  {
    key: 'definitionsCreated',
    label: 'Definitions created',
    nouns: ['definition created', 'definitions created'],
  },
  {
    key: 'definitionsUpdated',
    label: 'Definitions updated',
    nouns: ['definition updated', 'definitions updated'],
  },
  { key: 'steps', label: 'Steps', nouns: ['step', 'steps'] },
  {
    key: 'dependencies',
    label: 'Dependencies',
    nouns: ['dependency', 'dependencies'],
  },
  {
    key: 'controlRelationships',
    label: 'Control relationships',
    nouns: ['control relationship', 'control relationships'],
  },
  { key: 'instances', label: 'Instances', nouns: ['instance', 'instances'] },
  {
    key: 'roleAssignments',
    label: 'Role assignments',
    nouns: ['role assignment', 'role assignments'],
  },
  { key: 'skipped', label: 'Skipped', nouns: ['skipped', 'skipped'] },
  { key: 'failed', label: 'Failed', nouns: ['failed', 'failed'] },
];

const validationMessages = computed(() => {
  const messages: string[] = [];
  if (selectedFiles.value.length > WORKFLOW_IMPORT_MAX_FILES) {
    messages.push(
      `Choose at most ${WORKFLOW_IMPORT_MAX_FILES} files per import.`,
    );
  }
  const oversized = selectedFiles.value.filter(
    (file) => file.size > WORKFLOW_IMPORT_MAX_FILE_SIZE_BYTES,
  );
  if (oversized.length) {
    messages.push(
      `Each file must be ${WORKFLOW_IMPORT_MAX_FILE_SIZE_MB} MB or smaller. Remove ${oversized
        .map((file) => file.name)
        .join(', ')}.`,
    );
  }
  return messages;
});

function hasImportedRecords(summary: WorkflowImportSummary): boolean {
  return (
    summary.definitionsCreated > 0 ||
    summary.definitionsUpdated > 0 ||
    summary.steps > 0 ||
    summary.dependencies > 0 ||
    summary.controlRelationships > 0 ||
    summary.instances > 0 ||
    summary.roleAssignments > 0
  );
}

const resultTone = computed(() => {
  if (!results.value) return 'info';
  if (
    results.value.successfulFiles === 0 ||
    (results.value.summary.failed > 0 &&
      !hasImportedRecords(results.value.summary))
  ) {
    return 'error';
  }
  if (results.value.failedFiles > 0 || results.value.summary.failed > 0) {
    return 'warning';
  }
  return 'success';
});

const resultHeadline = computed(() => {
  if (!results.value) return '';
  if (resultTone.value === 'error')
    return 'Import failed; no workflow records were imported';
  const files = `${results.value.successfulFiles} of ${plural(results.value.totalFiles, 'file')}`;
  return resultTone.value === 'warning'
    ? `${files} processed with failures`
    : `${files} processed`;
});

const summaryItems = computed(() =>
  summaryFields.map((field) => ({
    key: field.key,
    label: field.label,
    value: results.value?.summary[field.key] ?? 0,
  })),
);

function fileTone(result: WorkflowImportFileResult) {
  if (!result.success) return 'error';
  if (result.summary.failed > 0) {
    return hasImportedRecords(result.summary) ? 'warning' : 'error';
  }
  return 'success';
}

/** The non-zero counts, e.g. "1 definition created, 12 steps". */
function fileRecords(result: WorkflowImportFileResult): string {
  return summaryFields
    .filter((field) => result.summary[field.key] > 0)
    .map((field) => plural(result.summary[field.key], ...field.nouns))
    .join(', ');
}

function filesChanged() {
  results.value = null;
  pageError.value = '';
}

async function submitImport() {
  if (!selectedFiles.value.length) {
    pageError.value = 'Choose at least one workflow JSON file.';
    return;
  }
  if (validationMessages.value.length) return;
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
  <Panel
    title="Workflows"
    description="SOC 2 CCF workflow seed files."
    :level="2"
  >
    <form novalidate @submit.prevent="submitImport">
      <Stack gap="4">
        <FormField
          label="Files"
          :hint="`JSON, up to ${WORKFLOW_IMPORT_MAX_FILES} files of ${WORKFLOW_IMPORT_MAX_FILE_SIZE_MB} MB each`"
          :error="pageError || validationMessages.join(' ') || undefined"
        >
          <FileField
            v-model:files="selectedFiles"
            accept=".json,application/json"
            multiple
            @update:files="filesChanged"
          />
        </FormField>
        <div>
          <Button variant="primary" type="submit" :loading="importing"
            >Import</Button
          >
        </div>
        <Stack v-if="results" gap="3">
          <InlineMessage :tone="resultTone" :title="resultHeadline">
            <p v-if="results.failedFiles">
              {{ plural(results.failedFiles, 'file') }} failed. See each file
              below.
            </p>
          </InlineMessage>
          <DescriptionList :items="summaryItems" />
          <InlineMessage
            v-for="(result, index) in results.results"
            :key="`${result.filename}-${index}`"
            :tone="fileTone(result)"
            :title="result.filename"
          >
            <p>{{ result.message }}</p>
            <p v-if="fileRecords(result)">{{ fileRecords(result) }}</p>
          </InlineMessage>
        </Stack>
      </Stack>
    </form>
  </Panel>
</template>
