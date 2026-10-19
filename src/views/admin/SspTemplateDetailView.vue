<template>
  <PageHeader>System Template</PageHeader>
  <PageSubHeader v-if="template">{{ template.name }}</PageSubHeader>

  <div class="mt-6 space-y-4">
    <div class="flex gap-2">
      <RouterLinkButton
        :to="{ name: 'admin-ssp-templates' }"
        variant="outlined"
      >
        Back to List
      </RouterLinkButton>
      <PrimaryButton v-if="template" @click="dialogVisible = true">
        Edit Template
      </PrimaryButton>
      <SecondaryButton
        v-if="template"
        :disabled="!template.enabled || isRunning"
        data-testid="run-now"
        @click="runNow"
      >
        {{ isRunning ? 'Queuing...' : 'Run now' }}
      </SecondaryButton>
      <span
        v-if="template && !template.enabled"
        class="self-center text-sm text-gray-500 dark:text-slate-400"
      >
        Enable the template to run it.
      </span>
    </div>

    <PageCard>
      <p v-if="isLoading" class="text-gray-500 dark:text-slate-400">
        Loading template...
      </p>
      <p v-else-if="error" class="text-red-500">Failed to load template.</p>
      <dl
        v-else-if="template"
        class="grid grid-cols-1 md:grid-cols-2 gap-4"
        data-testid="ssp-template-summary"
      >
        <div v-for="field in fields" :key="field.label">
          <dt
            class="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400"
          >
            {{ field.label }}
          </dt>
          <dd
            class="text-sm text-gray-900 dark:text-slate-200 whitespace-pre-wrap"
          >
            {{ field.value || '-' }}
          </dd>
        </div>
      </dl>
    </PageCard>

    <template v-if="template">
      <SspTemplatePreviewPanel :key="template.updatedAt" :template="template" />
      <SspTemplateInstancesTable :template-id="templateId" />
    </template>
  </div>

  <SspTemplateFormDialog
    v-model:visible="dialogVisible"
    :template="template"
    @saved="loadTemplate()"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useDataApi } from '@/composables/axios';
import { serializeFilter } from '@/parsers/labelfilter';
import { getErrorDetail } from '@/utils/httpErrors';
import { getIdFromRoute } from '@/utils/get-id-from-route';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import PageCard from '@/components/PageCard.vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import SspTemplateFormDialog from '@/components/ssp-templates/SspTemplateFormDialog.vue';
import SspTemplateInstancesTable from '@/components/ssp-templates/SspTemplateInstancesTable.vue';
import SspTemplatePreviewPanel from '@/components/ssp-templates/SspTemplatePreviewPanel.vue';
import { formatSspTemplateDate, type SspTemplate } from '@/types/ssp-templates';

const route = useRoute();
const toast = useToast();
const templateId = computed(() => getIdFromRoute(route));
const dialogVisible = ref(false);

const {
  data: template,
  isLoading,
  error,
  execute,
} = useDataApi<SspTemplate>(null, {}, { immediate: false });

const { execute: executeRun, isLoading: isRunning } = useDataApi<unknown>(
  null,
  { method: 'POST' },
  { immediate: false },
);

// Discovery runs in the background (202); the created SSPs table shows its result once
// refreshed.
async function runNow() {
  try {
    await executeRun(`/api/admin/ssp-templates/${templateId.value}/run`);
    toast.add({
      severity: 'success',
      summary: 'Discovery queued',
      detail: 'Refresh the created SSPs in a moment to see the result.',
      life: 4000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Run failed',
      detail: await getErrorDetail(err, 'Failed to queue a discovery run.'),
      life: 4000,
    });
  }
}

function loadTemplate() {
  return execute(`/api/admin/ssp-templates/${templateId.value}`);
}

const fields = computed(() => {
  const t = template.value;
  if (!t) {
    return [];
  }
  return [
    { label: 'Keys', value: t.keys.join(', ') },
    { label: 'Enabled', value: t.enabled ? 'Yes' : 'No' },
    { label: 'Evidence filter', value: serializeFilter(t.filter) },
    {
      label: 'Scope label groups',
      value: (t.scopeLabels ?? []).map((group) => group.join(' + ')).join('\n'),
    },
    { label: 'Minimum streams', value: String(t.minStreams) },
    { label: 'Profiles', value: String(t.profileIds?.length ?? 0) },
    { label: 'Title template', value: t.titleTemplate },
    { label: 'Description template', value: t.descriptionTemplate },
    {
      label: 'Properties',
      value: (t.props ?? []).map((p) => `${p.name}: ${p.value}`).join('\n'),
    },
    {
      label: 'Last updated',
      value: formatSspTemplateDate(t.updatedAt),
    },
  ];
});

watch(
  templateId,
  (id) => {
    if (id) {
      loadTemplate();
    }
  },
  { immediate: true },
);
</script>
