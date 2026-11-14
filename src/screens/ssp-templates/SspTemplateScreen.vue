<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useAuthenticatedInstance } from '@/composables/axios';
import { serializeFilter } from '@/parsers/labelfilter';
import type { SspTemplate } from '@/types/ssp-templates';
import { getErrorDetail } from '@/utils/httpErrors';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import SspTemplateFormDialog from '@/components/ssp-templates/SspTemplateFormDialog.vue';
import SspTemplateInstancesPanel from './SspTemplateInstancesPanel.vue';
import SspTemplatePreviewPanel from '@/components/ssp-templates/SspTemplatePreviewPanel.vue';
import { formatDateTime } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';

/**
 * A system template (/admin/ssp-templates/:id): its settings, Edit and Run now. The preview of
 * what it would create, the systems it has created, and the edit form are classic islands.
 */
const route = useRoute();
const toast = useToast();
const api = useAuthenticatedInstance();
const id = String(route.params.id);

const template = useApiQuery<SspTemplate>(`/api/admin/ssp-templates/${id}`);
const formOpen = ref(false);

const facts = computed(() => {
  const t = template.data.value;
  if (!t) return [];
  return [
    { key: 'keys', label: 'Keys', value: t.keys.join(', ') },
    {
      key: 'filter',
      label: 'Evidence filter',
      value: t.filter ? serializeFilter(t.filter) : '',
    },
    {
      key: 'scope',
      label: 'Scope label groups',
      value: (t.scopeLabels ?? []).map((group) => group.join(' + ')).join('; '),
    },
    { key: 'minStreams', label: 'Minimum streams', value: t.minStreams },
    { key: 'profiles', label: 'Profiles', value: t.profileIds?.length ?? 0 },
    { key: 'title', label: 'Title template', value: t.titleTemplate },
    {
      key: 'description',
      label: 'Description template',
      value: t.descriptionTemplate,
    },
    {
      key: 'props',
      label: 'Properties',
      value: (t.props ?? []).map((p) => `${p.name}: ${p.value}`).join('; '),
    },
    {
      key: 'updated',
      label: 'Last updated',
      value: formatDateTime(t.updatedAt),
    },
  ];
});

// Discovery runs in the background (202); the created systems table shows the result once
// refreshed.
const running = ref(false);
async function runNow(): Promise<void> {
  running.value = true;
  try {
    await api.post(`/api/admin/ssp-templates/${id}/run`);
    toast.add({
      severity: 'success',
      summary: 'Discovery queued',
      detail: 'Refresh the created systems in a moment to see the result.',
      life: 4000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "Discovery didn't start",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <DataState
    v-if="!template.data.value"
    :status="
      template.status.value === 'ready' ? 'error' : template.status.value
    "
    subject="this system template"
    skeleton="panel"
    @retry="template.retry"
  />
  <RecordTemplate v-else :title="template.data.value.name">
    <template #status>
      <Tag :label="template.data.value.enabled ? 'Enabled' : 'Disabled'" />
    </template>
    <template #actions>
      <Button icon="edit" @click="formOpen = true">Edit</Button>
      <Button
        variant="primary"
        icon="refresh"
        :loading="running"
        :disabled-reason="
          template.data.value.enabled
            ? undefined
            : 'Enable the template to run it.'
        "
        @click="runNow"
        >Run now</Button
      >
    </template>
    <Stack gap="6">
      <DescriptionList :items="facts" />
      <LegacyPage>
        <SspTemplatePreviewPanel
          :key="`${template.data.value.id}-${template.data.value.updatedAt}`"
          :template="template.data.value"
        />
      </LegacyPage>
      <SspTemplateInstancesPanel :template-id="id" />
    </Stack>
  </RecordTemplate>

  <SspTemplateFormDialog
    v-model:visible="formOpen"
    :template="template.data.value"
    @saved="template.retry"
  />
</template>
