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
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useDataApi } from '@/composables/axios';
import { serializeFilter } from '@/parsers/labelfilter';
import { getIdFromRoute } from '@/utils/get-id-from-route';
import PageCard from '@/components/PageCard.vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import { formatSspTemplateDate, type SspTemplate } from '@/types/ssp-templates';

const route = useRoute();
const templateId = computed(() => getIdFromRoute(route));

const {
  data: template,
  isLoading,
  error,
  execute,
} = useDataApi<SspTemplate>(null, {}, { immediate: false });

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
