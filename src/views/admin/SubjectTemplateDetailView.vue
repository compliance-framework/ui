<template>
  <PageHeader>Subject Template</PageHeader>
  <PageSubHeader v-if="template">{{ template.name }}</PageSubHeader>

  <div class="mt-6 space-y-4">
    <div class="flex gap-2">
      <RouterLinkButton
        :to="{ name: 'admin-subject-templates' }"
        variant="outlined"
      >
        Back to List
      </RouterLinkButton>
      <RouterLinkButton
        v-if="templateId"
        :to="{ name: 'admin-subject-templates', query: { edit: templateId } }"
      >
        Edit Template
      </RouterLinkButton>
    </div>

    <div
      class="rounded-md bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 p-6"
    >
      <template v-if="isLoading">
        <p class="text-gray-500 dark:text-slate-400">Loading template...</p>
      </template>

      <template v-else-if="error">
        <p class="text-red-500">Failed to load template.</p>
      </template>

      <template v-else-if="!template">
        <p class="text-gray-500 dark:text-slate-400">Template not found.</p>
      </template>

      <template v-else>
        <div class="space-y-6">
          <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p
                class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400"
              >
                Name
              </p>
              <p class="text-sm text-gray-900 dark:text-slate-200">
                {{ template.name || 'N/A' }}
              </p>
            </div>
            <div>
              <p
                class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400"
              >
                Type
              </p>
              <p class="text-sm text-gray-900 dark:text-slate-200">
                {{ getTypeLabel(template.type) }}
              </p>
            </div>
            <div>
              <p
                class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400"
              >
                Source Mode
              </p>
              <p class="text-sm text-gray-900 dark:text-slate-200">
                {{ getSourceModeLabel(template.sourceMode) }}
              </p>
            </div>
            <div>
              <p
                class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400"
              >
                Last Updated
              </p>
              <p class="text-sm text-gray-900 dark:text-slate-200">
                {{
                  formatSubjectTemplateDate(
                    template.updatedAt || template.createdAt,
                  )
                }}
              </p>
            </div>
          </section>

          <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p
                class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400"
              >
                Title Template
              </p>
              <p
                class="text-sm text-gray-900 dark:text-slate-200 whitespace-pre-wrap"
              >
                {{ template.titleTemplate || '-' }}
              </p>
            </div>
            <div>
              <p
                class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400"
              >
                Description Template
              </p>
              <p
                class="text-sm text-gray-900 dark:text-slate-200 whitespace-pre-wrap"
              >
                {{ template.descriptionTemplate || '-' }}
              </p>
            </div>
            <div>
              <p
                class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400"
              >
                Purpose Template
              </p>
              <p
                class="text-sm text-gray-900 dark:text-slate-200 whitespace-pre-wrap"
              >
                {{ template.purposeTemplate || '-' }}
              </p>
            </div>
            <div>
              <p
                class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400"
              >
                Remarks Template
              </p>
              <p
                class="text-sm text-gray-900 dark:text-slate-200 whitespace-pre-wrap"
              >
                {{ template.remarksTemplate || '-' }}
              </p>
            </div>
          </section>

          <section>
            <p
              class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2"
            >
              Identity Label Keys
            </p>
            <div class="flex flex-wrap gap-2">
              <Chip
                v-for="(identityLabelKey, index) in template.identityLabelKeys"
                :key="`${identityLabelKey}-${index}`"
                :label="identityLabelKey"
              />
              <p
                v-if="!template.identityLabelKeys?.length"
                class="text-sm text-gray-500 dark:text-slate-400"
              >
                No identity label keys configured.
              </p>
            </div>
          </section>

          <section>
            <p
              class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2"
            >
              Selector Labels
            </p>
            <div class="flex flex-wrap gap-2">
              <Chip
                v-for="(selectorLabel, index) in template.selectorLabels"
                :key="`${selectorLabel.key}-${selectorLabel.value}-${index}`"
                :label="`${selectorLabel.key}: ${selectorLabel.value}`"
              />
              <p
                v-if="!template.selectorLabels?.length"
                class="text-sm text-gray-500 dark:text-slate-400"
              >
                No selector labels configured.
              </p>
            </div>
          </section>

          <section>
            <p
              class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2"
            >
              Label Schema
            </p>

            <div
              v-if="template.labelSchema?.length"
              class="overflow-x-auto rounded-md border border-ccf-300 dark:border-slate-700"
            >
              <table class="w-full min-w-[520px] text-sm">
                <thead class="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th class="text-left p-3 font-semibold">Key</th>
                    <th class="text-left p-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(schemaField, index) in template.labelSchema"
                    :key="`${schemaField.key}-${index}`"
                    class="border-t border-ccf-300 dark:border-slate-700"
                  >
                    <td class="p-3 text-gray-900 dark:text-slate-200">
                      {{ schemaField.key }}
                    </td>
                    <td class="p-3 text-gray-600 dark:text-slate-400">
                      {{ schemaField.description || '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p v-else class="text-sm text-gray-500 dark:text-slate-400">
              No label schema configured.
            </p>
          </section>

          <section>
            <p
              class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2"
            >
              Props
            </p>
            <div v-if="template.props?.length" class="space-y-2">
              <div
                v-for="(prop, index) in template.props"
                :key="`prop-${prop.uuid || index}`"
                class="rounded-md border border-ccf-300 dark:border-slate-700 p-3"
              >
                <p class="text-sm text-gray-900 dark:text-slate-200">
                  {{ prop.name || '-' }}: {{ prop.value || '-' }}
                </p>
                <p class="text-xs text-gray-500 dark:text-slate-400">
                  class: {{ prop.class || '-' }} | ns: {{ prop.ns || '-' }}
                </p>
                <p
                  v-if="prop.remarks"
                  class="text-xs text-gray-500 dark:text-slate-400"
                >
                  remarks: {{ prop.remarks }}
                </p>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500 dark:text-slate-400">
              No properties configured.
            </p>
          </section>

          <section>
            <p
              class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2"
            >
              Links
            </p>
            <div v-if="template.links?.length" class="space-y-2">
              <div
                v-for="(link, index) in template.links"
                :key="`link-${link.href}-${index}`"
                class="rounded-md border border-ccf-300 dark:border-slate-700 p-3"
              >
                <p class="text-sm text-gray-900 dark:text-slate-200">
                  {{ link.href }}
                </p>
                <p class="text-xs text-gray-500 dark:text-slate-400">
                  rel: {{ link.rel || '-' }} | text: {{ link.text || '-' }}
                </p>
              </div>
            </div>
            <p v-else class="text-sm text-gray-500 dark:text-slate-400">
              No links configured.
            </p>
          </section>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { AxiosError } from 'axios';
import Chip from '@/volt/Chip.vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import { useDataApi } from '@/composables/axios';
import {
  formatSubjectTemplateDate,
  getSubjectTemplateSourceModeLabel,
  getSubjectTemplateTypeLabel,
  type SubjectTemplate,
  type SubjectTemplateSourceMode,
  type SubjectTemplateType,
} from '@/types/subject-templates';

const route = useRoute();
const toast = useToast();

const templateId = computed(() => route.params.id as string);

const {
  data: template,
  isLoading,
  error,
  execute: fetchTemplate,
} = useDataApi<SubjectTemplate>(null, {}, { immediate: false });

watch(
  templateId,
  (newTemplateId) => {
    if (!newTemplateId) {
      return;
    }

    fetchTemplate(`/api/admin/subject-templates/${newTemplateId}`);
  },
  { immediate: true },
);

watch(
  () => error.value,
  (err) => {
    if (!err) {
      return;
    }

    const status = (err as AxiosError).response?.status;
    if (status === 403) {
      toast.add({
        severity: 'warn',
        summary: 'Insufficient permissions',
        detail: "You don't have access to subject templates.",
        life: 4000,
      });
    }
  },
);

function getTypeLabel(type?: SubjectTemplateType): string {
  return getSubjectTemplateTypeLabel(type);
}

function getSourceModeLabel(sourceMode?: SubjectTemplateSourceMode): string {
  return getSubjectTemplateSourceModeLabel(sourceMode);
}
</script>
