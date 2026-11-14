<script setup lang="ts">
/**
 * Import (/admin/import): OSCAL documents and evidence filters from JSON files, each with a
 * result per file, plus workflows (the workflow import panel is a classic island).
 */
import { reactive } from 'vue';
import type { AxiosError } from 'axios';
import { useToast } from 'primevue/usetoast';
import { useAuthenticatedInstance } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import { plural } from '@/ds/format';
import Button from '@/ds/components/Button/Button.vue';
import FileField from '@/ds/components/FileField/FileField.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import WorkflowImportPanel from '@/views/admin/partials/WorkflowImportPanel.vue';

/** The import endpoints answer in snake_case; the client camelCases it. */
interface FileResult {
  filename: string;
  success: boolean;
  message: string;
  type?: string;
  title?: string;
  count?: number;
}
interface ImportResponse {
  totalFiles: number;
  successfulCount: number;
  failedCount: number;
  totalDashboards?: number;
  results: FileResult[];
}

interface Importer {
  key: 'oscal' | 'filters';
  title: string;
  description: string;
  url: string;
  files: File[];
  error: string;
  busy: boolean;
  result?: ImportResponse;
}

const toast = useToast();
const api = useAuthenticatedInstance();

const importers = reactive<Importer[]>([
  {
    key: 'oscal',
    title: 'OSCAL documents',
    description:
      'Catalogs, profiles, system security plans, assessment plans and results, component definitions and POA&Ms.',
    url: '/api/oscal/import',
    files: [],
    error: '',
    busy: false,
  },
  {
    key: 'filters',
    title: 'Evidence filters',
    description: 'Evidence filters with their filters and control links.',
    url: '/api/filters/import',
    files: [],
    error: '',
    busy: false,
  },
]);

async function run(importer: Importer) {
  importer.error = importer.files.length ? '' : 'Choose at least one file.';
  if (importer.error) return;
  importer.busy = true;
  importer.result = undefined;
  try {
    const form = new FormData();
    importer.files.forEach((file) => form.append('files', file));
    const response = await api.post<{ data: ImportResponse }>(
      importer.url,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    const result = response.data.data;
    importer.result = result;
    toast.add({
      severity: result.failedCount ? 'warn' : 'success',
      summary: result.failedCount ? 'Imported with failures' : 'Imported',
      detail: `${result.successfulCount} of ${plural(result.totalFiles, 'file')} imported.`,
      life: 5000,
    });
  } catch (error) {
    // When every file fails the API answers 400, still with a result per file.
    const failed = (error as AxiosError<{ data?: ImportResponse }>).response
      ?.data?.data;
    if (failed?.results) importer.result = failed;
    else importer.error = await getErrorDetail(error, 'Try again.');
  } finally {
    importer.busy = false;
  }
}

function detail(importer: Importer, file: FileResult): string {
  if (file.type && file.title)
    return `${file.message} ${file.type}: ${file.title}.`;
  if (importer.key === 'filters' && file.count)
    return `${file.message} ${plural(file.count, 'evidence filter')}.`;
  return file.message;
}
</script>

<template>
  <Stack gap="6">
    <PageHeader
      title="Import"
      description="Import OSCAL documents, evidence filters and workflows from JSON files."
    />
    <LegacyPage>
      <WorkflowImportPanel />
    </LegacyPage>
    <Grid min="md" gap="5">
      <Panel
        v-for="importer in importers"
        :key="importer.key"
        :title="importer.title"
        :description="importer.description"
        :level="2"
      >
        <form novalidate @submit.prevent="run(importer)">
          <Stack gap="4">
            <FormField label="Files" hint="JSON" :error="importer.error">
              <FileField
                v-model:files="importer.files"
                @update:files="importer.error = ''"
                accept=".json,application/json"
                multiple
              />
            </FormField>
            <div>
              <Button variant="primary" type="submit" :loading="importer.busy"
                >Import</Button
              >
            </div>
            <Stack v-if="importer.result" gap="2">
              <InlineMessage
                v-for="file in importer.result.results"
                :key="file.filename"
                :tone="file.success ? 'success' : 'error'"
                :title="file.filename"
              >
                <p>{{ detail(importer, file) }}</p>
              </InlineMessage>
            </Stack>
          </Stack>
        </form>
      </Panel>
    </Grid>
  </Stack>
</template>
