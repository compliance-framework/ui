<script setup lang="ts">
/**
 * Risk templates (/admin/risk-templates, List template, admin): reusable risks that policies raise
 * when evidence fails. Search by title, statement, plugin or package (in the address). Each opens
 * its details, and can be edited, duplicated or deleted (with a warning when risks use it).
 */
import { computed, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import {
  getRiskTemplateApiId,
  getRiskTemplateKey,
  getRiskTemplateUsageCount,
  type RiskTemplate,
} from '@/types/risk-templates';
import { getErrorDetail } from '@/utils/httpErrors';
import { formatDate, plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import FilterBar from '@/ds/components/FilterBar/FilterBar.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import ListTemplate from '@/ds/templates/ListTemplate/ListTemplate.vue';
import { matches, useListView } from '../listView';
import RiskTemplateForm from './RiskTemplateForm.vue';
import { duplicateRiskTemplateRequest } from './riskTemplateRequest';

const toast = useToast();
const api = useAuthenticatedInstance();

const view = useListView(['title', 'usage', 'created'] as const, 'title');
const { q, draft, chips, chipLabels, sort } = view;

const templates = useApiQuery<RiskTemplate[]>('/api/admin/risk-templates');

const rows = computed(() =>
  view.sortRows(
    (templates.data.value ?? [])
      .filter((t) =>
        matches(
          q.value,
          t.title,
          t.statement ?? '',
          t.pluginId ?? '',
          t.policyPackage ?? '',
          t.name ?? '',
        ),
      )
      .map((t, index) => ({
        id: getRiskTemplateKey(t) || `risk-template-${index}`,
        title: t.title,
        statement: t.statement ?? '',
        hints: `${t.likelihoodHint || 'Not set'} / ${t.impactHint || 'Not set'}`,
        // A string, as the list sorts with a numeric-aware string compare.
        usage: String(getRiskTemplateUsageCount(t)),
        created: t.createdAt ?? t.createdDate ?? '',
        active: t.isActive,
        template: t,
      })),
    'title',
  ),
);

const status = computed(() =>
  templates.status.value === 'ready' && rows.value.length === 0
    ? 'empty'
    : templates.status.value,
);
const summary = computed(() => {
  if (!q.value || templates.status.value !== 'ready') return '';
  return rows.value.length
    ? `${plural(rows.value.length, 'template')} match.`
    : 'No templates match.';
});

const columns: DataTableColumn[] = [
  { key: 'title', label: 'Template', sortable: true, minWidth: 'sm' },
  { key: 'statement', label: 'Statement', minWidth: 'md' },
  { key: 'hints', label: 'Likelihood / impact' },
  {
    key: 'usage',
    label: 'Used by',
    sortable: true,
    align: 'end',
    initialDirection: 'descending',
  },
  {
    key: 'created',
    label: 'Created',
    sortable: true,
    initialDirection: 'descending',
  },
];

// View, create and edit ----------------------------------------------------------------------

const viewing = ref<RiskTemplate>();
const viewOpen = computed({
  get: () => Boolean(viewing.value),
  set: (open: boolean) => {
    if (!open) viewing.value = undefined;
  },
});
const details = computed(() => {
  const t = viewing.value;
  if (!t) return [];
  return [
    { key: 'plugin', label: 'Plugin ID', value: t.pluginId },
    { key: 'package', label: 'Policy package', value: t.policyPackage },
    { key: 'name', label: 'Name', value: t.name },
    { key: 'statement', label: 'Statement', value: t.statement },
    { key: 'likelihood', label: 'Likelihood hint', value: t.likelihoodHint },
    { key: 'impact', label: 'Impact hint', value: t.impactHint },
    {
      key: 'violations',
      label: 'Violation IDs',
      value: (t.violationIds ?? []).join(', '),
    },
    {
      key: 'threats',
      label: 'Threat IDs',
      value: (t.threatIds ?? [])
        .map((th) => `${th.system} ${th.id}: ${th.title}`)
        .join('; '),
    },
    {
      key: 'remediation',
      label: 'Remediation',
      value: t.remediationTemplate
        ? [
            t.remediationTemplate.title,
            ...(t.remediationTemplate.tasks ?? []).map(
              (task, i) => `${i + 1}. ${task.title}`,
            ),
          ].join('; ')
        : '',
    },
    {
      key: 'state',
      label: 'State',
      value: t.isActive === undefined ? '' : t.isActive ? 'Active' : 'Inactive',
    },
    {
      key: 'usage',
      label: 'Used by',
      value: plural(getRiskTemplateUsageCount(t), 'risk'),
    },
  ];
});

/** The template the form edits; `null` while creating one. */
const editing = ref<RiskTemplate | null>();
const formOpen = computed({
  get: () => editing.value !== undefined,
  set: (open: boolean) => {
    if (!open) editing.value = undefined;
  },
});
function saved(template: RiskTemplate) {
  toast.add({
    severity: 'success',
    summary: editing.value ? 'Template saved' : 'Template created',
    detail: `${template?.title ?? 'The template'} was saved.`,
    life: 3000,
  });
  editing.value = undefined;
  templates.retry();
}

async function duplicate(template: RiskTemplate) {
  try {
    await api.post(
      '/api/admin/risk-templates',
      duplicateRiskTemplateRequest(template),
      { transformRequest: [decamelizeKeys] },
    );
    toast.add({
      severity: 'success',
      summary: 'Template duplicated',
      detail: `${template.title} (Copy) was created.`,
      life: 3000,
    });
    templates.retry();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The template wasn't duplicated",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

// Delete ---------------------------------------------------------------------------------------

const deleting = ref<RiskTemplate>();
const deleteOpen = computed({
  get: () => Boolean(deleting.value),
  set: (open: boolean) => {
    if (!open) deleting.value = undefined;
  },
});
async function remove() {
  const template = deleting.value;
  deleting.value = undefined;
  const id = template && getRiskTemplateApiId(template);
  if (!template || !id) return;
  try {
    await api.delete(`/api/admin/risk-templates/${id}`);
    toast.add({
      severity: 'success',
      summary: 'Template deleted',
      detail: `${template.title} was deleted.`,
      life: 3000,
    });
    templates.retry();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The template wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

const noId = (t: RiskTemplate) =>
  getRiskTemplateApiId(t)
    ? undefined
    : "This template has no ID, so it can't be changed.";
const actions = (t: RiskTemplate): MenuEntry[] => [
  {
    label: 'View details',
    icon: 'details',
    onSelect: () => (viewing.value = t),
  },
  {
    label: 'Edit template',
    icon: 'edit',
    disabledReason: noId(t),
    onSelect: () => (editing.value = t),
  },
  {
    label: 'Duplicate',
    icon: 'copy',
    onSelect: () => void duplicate(t),
  },
  {
    label: 'Delete template',
    icon: 'delete',
    tone: 'danger',
    disabledReason: noId(t),
    onSelect: () => (deleting.value = t),
  },
];
</script>

<template>
  <ListTemplate
    title="Risk templates"
    description="Reusable risks, raised automatically when evidence fails a policy."
  >
    <template #actions>
      <Button variant="primary" icon="add" @click="editing = null"
        >New template</Button
      >
    </template>
    <template #filters>
      <FilterBar
        v-model:query="draft"
        label="Filter risk templates"
        search-label="Search risk templates"
        search-placeholder="Title, statement, plugin or package"
        :chips="chips"
        :summary="summary"
        @search="view.search"
        @remove="view.clearSearch()"
        @clear="view.clearSearch()"
      />
    </template>

    <DataState
      :status="status"
      subject="risk templates"
      empty-title="No risk templates yet"
      empty-body="A risk template is raised as a risk when evidence fails the policy it names."
      icon="risks"
      :filters="chipLabels"
      @retry="templates.retry"
      @clear-filters="view.clearSearch()"
    >
      <DataTable
        v-model:sort="sort"
        :caption="plural(rows.length, 'template')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-title="{ row: r }">
          <Stack gap="1">
            <Text as="span">{{ r.title }}</Text>
            <Tag v-if="r.active === false" label="Inactive" />
          </Stack>
        </template>
        <template #cell-statement="{ row: r }">{{
          r.statement || 'Not set'
        }}</template>
        <template #cell-usage="{ row: r }">{{
          plural(Number(r.usage), 'risk')
        }}</template>
        <template #cell-created="{ row: r }">{{
          r.created ? formatDate(r.created) : 'Not known'
        }}</template>
        <template #actions="{ row: r }">
          <Menu
            :label="`Actions for ${r.title}`"
            :items="actions(r.template)"
          />
        </template>
      </DataTable>
    </DataState>
  </ListTemplate>

  <Dialog v-model:open="viewOpen" :title="viewing?.title ?? 'Risk template'">
    <DescriptionList :items="details" layout="stacked" />
  </Dialog>
  <Dialog
    v-model:open="formOpen"
    :title="editing ? `Edit ${editing.title}` : 'New risk template'"
    size="l"
  >
    <RiskTemplateForm
      v-if="formOpen"
      :template="editing ?? undefined"
      @cancel="editing = undefined"
      @saved="saved"
    />
  </Dialog>
  <ConfirmDialog
    v-model:open="deleteOpen"
    :title="`Delete ${deleting?.title ?? 'this template'}?`"
    confirm-label="Delete template"
    @confirm="remove"
    ><Text
      ><template v-if="deleting && getRiskTemplateUsageCount(deleting)"
        >{{ plural(getRiskTemplateUsageCount(deleting), 'risk') }} use this
        template. </template
      >This can't be undone.</Text
    ></ConfirmDialog
  >
</template>
