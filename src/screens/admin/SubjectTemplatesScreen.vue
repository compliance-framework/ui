<script setup lang="ts">
/**
 * Subject templates (/admin/subject-templates): reusable templates for the subjects evidence is
 * about. Search by name, filter by type and source mode, sort (all in the address); each template
 * opens its page, or can be edited or duplicated. `?edit=<id>` (from a template's page) opens its
 * editor.
 */
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import {
  createEmptySubjectTemplateForm,
  createSubjectTemplateFormFromTemplate,
  generateUniqueSubjectTemplateCopyName,
  getSubjectTemplateSourceModeLabel,
  getSubjectTemplateTypeLabel,
  SUBJECT_TEMPLATE_SOURCE_MODE_OPTIONS,
  SUBJECT_TEMPLATE_TYPE_OPTIONS,
  type SubjectTemplate,
  type SubjectTemplateFormData,
} from '@/types/subject-templates';
import { formatDate, plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Select from '@/ds/components/Select/Select.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import SubjectTemplateForm from './SubjectTemplateForm.vue';
import { matches, useListView } from '../listView';

interface Row {
  id: string;
  name: string;
  type: string;
  sourceMode: string;
  updated: string;
  template: SubjectTemplate;
}

const route = useRoute();
const router = useRouter();
const toast = useToast();

const view = useListView(
  ['name', 'type', 'sourceMode', 'updated'] as const,
  'name',
);
const { q, draft, sort } = view;

const typeFilter = computed({
  get: () => String(route.query.type ?? ''),
  set: (value: string) =>
    void router.push({ query: { ...route.query, type: value || undefined } }),
});
const sourceFilter = computed({
  get: () => String(route.query.source ?? ''),
  set: (value: string) =>
    void router.push({ query: { ...route.query, source: value || undefined } }),
});
const typeOptions = [
  { value: '', label: 'All types' },
  ...SUBJECT_TEMPLATE_TYPE_OPTIONS,
];
const sourceOptions = [
  { value: '', label: 'All source modes' },
  ...SUBJECT_TEMPLATE_SOURCE_MODE_OPTIONS,
];

const chips = computed(() => [
  ...view.chips.value,
  ...(typeFilter.value
    ? [
        {
          label: `Type: ${getSubjectTemplateTypeLabel(typeFilter.value as never)}`,
        },
      ]
    : []),
  ...(sourceFilter.value
    ? [
        {
          label: `Source: ${getSubjectTemplateSourceModeLabel(sourceFilter.value as never)}`,
        },
      ]
    : []),
]);
function clearFilters() {
  void router.push({
    query: { ...route.query, q: undefined, type: undefined, source: undefined },
  });
}

const templates = useApiQuery<SubjectTemplate[]>(
  '/api/admin/subject-templates',
  {
    isEmpty: (list) => list.length === 0,
  },
);

const rows = computed<Row[]>(() =>
  view.sortRows(
    (templates.data.value ?? [])
      .filter(
        (t) =>
          matches(q.value, t.name) &&
          (!typeFilter.value || t.type === typeFilter.value) &&
          (!sourceFilter.value || t.sourceMode === sourceFilter.value),
      )
      .map((template) => ({
        id: template.id ?? template.name ?? '',
        name: template.name || 'Unnamed template',
        type: getSubjectTemplateTypeLabel(template.type),
        sourceMode: getSubjectTemplateSourceModeLabel(template.sourceMode),
        updated: template.updatedAt || template.createdAt || '',
        template,
      })),
    'name',
  ),
);
const status = computed(() =>
  templates.status.value === 'ready' && rows.value.length === 0
    ? 'empty'
    : templates.status.value,
);
const columns: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true, minWidth: 'sm' },
  { key: 'type', label: 'Type', sortable: true, nowrap: true },
  { key: 'sourceMode', label: 'Source mode', sortable: true, nowrap: true },
  {
    key: 'updated',
    label: 'Last updated',
    sortable: true,
    nowrap: true,
    initialDirection: 'descending',
  },
];

// Form ---------------------------------------------------------------------------------------

const form = ref<{
  initial: SubjectTemplateFormData;
  templateId?: string;
  title: string;
}>();
const formOpen = computed({
  get: () => Boolean(form.value),
  set: (open: boolean) => {
    if (!open) form.value = undefined;
  },
});

function openCreate() {
  form.value = {
    initial: createEmptySubjectTemplateForm(),
    title: 'New subject template',
  };
}
function openEdit(template: SubjectTemplate) {
  form.value = {
    initial: createSubjectTemplateFormFromTemplate(template),
    templateId: template.id,
    title: `Edit ${template.name || 'subject template'}`,
  };
}
function duplicate(template: SubjectTemplate) {
  const initial = createSubjectTemplateFormFromTemplate(template);
  initial.name = generateUniqueSubjectTemplateCopyName(
    template.name ?? 'Template',
    (templates.data.value ?? []).map((t) => t.name ?? '').filter(Boolean),
  );
  form.value = {
    initial,
    title: `Duplicate ${template.name || 'subject template'}`,
  };
}
function saved() {
  form.value = undefined;
  templates.retry();
}

// A template's page links back here with ?edit=<id> to open its editor.
watch(
  [() => templates.data.value, () => route.query.edit],
  ([list, editId]) => {
    if (typeof editId !== 'string' || !list) return;
    const template = list.find((t) => t.id === editId);
    if (template) openEdit(template);
    else
      toast.add({
        severity: 'error',
        summary: 'Template not found',
        detail: "The template in the link doesn't exist any more.",
        life: 5000,
      });
    const query = { ...route.query };
    delete query.edit;
    void router.replace({ query });
  },
  { immediate: true },
);

const actions = (row: Row): MenuEntry[] => [
  {
    label: 'Edit template',
    icon: 'edit',
    disabledReason: row.template.id
      ? undefined
      : 'This template has no ID, so it cannot be edited.',
    onSelect: () => openEdit(row.template),
  },
  {
    label: 'Duplicate',
    icon: 'copy',
    onSelect: () => duplicate(row.template),
  },
];
</script>

<template>
  <ListTemplate
    title="Subject templates"
    description="Reusable templates for the subjects evidence is about."
  >
    <template #actions>
      <Button variant="primary" icon="add" @click="openCreate"
        >New template</Button
      >
    </template>
    <template #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter subject templates"
        search-label="Search subject templates"
        search-placeholder="Name"
        :chips="chips"
        :summary="
          templates.status.value === 'ready' && chips.length
            ? `${plural(rows.length, 'template')} match.`
            : ''
        "
        @search="view.search"
        @remove="clearFilters"
        @clear="clearFilters"
      >
        <FormField label="Type"
          ><Select v-model="typeFilter" :options="typeOptions"
        /></FormField>
        <FormField label="Source mode"
          ><Select v-model="sourceFilter" :options="sourceOptions"
        /></FormField>
      </FilterBar>
    </template>

    <DataState
      :status="status"
      subject="subject templates"
      empty-title="No subject templates"
      empty-body="Subject templates describe how evidence subjects become components, inventory items and other OSCAL objects."
      icon="templates"
      :filters="chips.map((c) => c.label)"
      @retry="templates.retry"
      @clear-filters="clearFilters"
    >
      <DataTable
        v-model:sort="sort"
        :caption="plural(rows.length, 'subject template')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-name="{ row: r }">
          <TextLink
            v-if="r.template.id"
            :to="{
              name: 'admin-subject-template-detail',
              params: { id: r.template.id },
            }"
            >{{ r.name }}</TextLink
          >
          <template v-else>{{ r.name }}</template>
        </template>
        <template #cell-updated="{ row: r }">{{
          r.updated ? formatDate(r.updated) : 'Not set'
        }}</template>
        <template #actions="{ row: r }">
          <Menu :label="`Actions for ${r.name}`" :items="actions(r)" />
        </template>
      </DataTable>
    </DataState>
  </ListTemplate>

  <Dialog
    v-model:open="formOpen"
    :title="form?.title ?? 'Subject template'"
    size="l"
  >
    <SubjectTemplateForm
      v-if="form"
      :initial="form.initial"
      :template-id="form.templateId"
      @cancel="form = undefined"
      @saved="saved"
    />
  </Dialog>
</template>
