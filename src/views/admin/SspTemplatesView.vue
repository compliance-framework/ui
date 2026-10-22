<template>
  <PageHeader>System Templates</PageHeader>
  <PageSubHeader>
    Create one SSP per application (or any label combination) found in the
    evidence
  </PageSubHeader>

  <div class="mt-6 space-y-4">
    <div
      class="rounded-md bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 overflow-x-auto"
    >
      <p v-if="isLoading" class="p-6 text-gray-500 dark:text-slate-400">
        Loading templates...
      </p>
      <p v-else-if="error" class="p-6 text-red-500">
        Error loading system templates.
      </p>
      <p
        v-else-if="!templates?.length"
        class="p-6 text-gray-500 dark:text-slate-400"
      >
        No system templates yet.
      </p>
      <table v-else class="w-full min-w-[900px] text-sm">
        <thead class="bg-gray-50 dark:bg-slate-800">
          <tr>
            <th class="text-left p-3 font-semibold">Name</th>
            <th class="text-left p-3 font-semibold">Keys</th>
            <th class="text-left p-3 font-semibold">Enabled</th>
            <th class="text-left p-3 font-semibold">Created SSPs</th>
            <th class="text-left p-3 font-semibold">Last run</th>
            <th class="text-left p-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="template in templates"
            :key="template.id"
            class="border-t border-ccf-300 dark:border-slate-700"
            data-testid="ssp-template-row"
          >
            <td class="p-3 font-medium text-gray-900 dark:text-slate-200">
              {{ template.name }}
            </td>
            <td class="p-3">
              <div class="flex flex-wrap gap-2">
                <Chip v-for="key in template.keys" :key="key" :label="key" />
              </div>
            </td>
            <td class="p-3 text-gray-600 dark:text-slate-400">
              {{ template.enabled ? 'Yes' : 'No' }}
            </td>
            <td class="p-3 text-gray-600 dark:text-slate-400">
              {{ template.sspCount ?? '-' }}
            </td>
            <td class="p-3 text-gray-600 dark:text-slate-400">
              {{ formatSspTemplateDate(template.lastRunAt) }}
            </td>
            <td class="p-3">
              <div class="flex flex-wrap gap-2">
                <RouterLinkButton
                  :to="{
                    name: 'admin-ssp-template-detail',
                    params: { id: template.id },
                  }"
                >
                  View
                </RouterLinkButton>
                <TertiaryButton @click="confirmDelete(template)">
                  Delete
                </TertiaryButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import Chip from '@/volt/Chip.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import { formatSspTemplateDate, type SspTemplate } from '@/types/ssp-templates';

const toast = useToast();
const confirm = useConfirm();

const {
  data: templates,
  isLoading,
  error,
  execute: loadTemplates,
} = useDataApi<SspTemplate[]>('/api/admin/ssp-templates');

const { execute: executeDelete } = useDataApi<void>(
  null,
  { method: 'DELETE' },
  { immediate: false },
);

function confirmDelete(template: SspTemplate) {
  confirm.require({
    header: 'Delete system template',
    message: `Delete the template "${template.name}"? The SSPs it created and their scope entries are kept.`,
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: () => deleteTemplate(template),
  });
}

async function deleteTemplate(template: SspTemplate) {
  try {
    await executeDelete(`/api/admin/ssp-templates/${template.id}`);
    toast.add({
      severity: 'success',
      summary: 'Template Deleted',
      detail: `System template "${template.name}" deleted.`,
      life: 3000,
    });
    await loadTemplates();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: await getErrorDetail(err, 'Failed to delete system template.'),
      life: 4000,
    });
  }
}
</script>
