<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/ds/toasts';
import { useAuthenticatedInstance } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import { formatDateTime } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/**
 * The Overview tab of an OSCAL record page (component definition, assessment plan, assessment
 * results, POA&M): its details, what it imports, and how much it contains, with Edit (and, for
 * assessment results, Delete) where the classic overview had them. The route picks the type.
 */
interface OverviewKind {
  noun: string;
  endpoint: string;
  counts: { label: string; path: string }[];
  /** The document this one imports: an assessment plan's SSP or assessment results' plan. */
  importKey?: 'importSsp' | 'importAp';
  importLabel?: string;
  editRoute?: string;
  /** Delete returns here; only where the classic overview offered it. */
  deleteTo?: string;
}

const KINDS: Record<string, OverviewKind> = {
  'component-definition-overview': {
    noun: 'component definition',
    endpoint: '/api/oscal/component-definitions',
    counts: [
      { label: 'Components', path: 'components' },
      { label: 'Capabilities', path: 'capabilities' },
      { label: 'Imported definitions', path: 'import-component-definitions' },
    ],
  },
  'assessment-plan-overview': {
    noun: 'assessment plan',
    endpoint: '/api/oscal/assessment-plans',
    counts: [
      { label: 'Tasks', path: 'tasks' },
      { label: 'Subjects', path: 'assessment-subjects' },
    ],
    importKey: 'importSsp',
    importLabel: 'System security plan',
    editRoute: 'assessment-plan-edit',
  },
  'assessment-results-overview': {
    noun: 'assessment results',
    endpoint: '/api/oscal/assessment-results',
    counts: [{ label: 'Results', path: 'results' }],
    importKey: 'importAp',
    importLabel: 'Assessment plan',
    editRoute: 'assessment-results-edit',
    deleteTo: 'assessment-results',
  },
  'plan-of-action-and-milestones-overview': {
    noun: 'POA&M',
    endpoint: '/api/oscal/plan-of-action-and-milestones',
    counts: [
      { label: 'POA&M items', path: 'poam-items' },
      { label: 'Observations', path: 'observations' },
      { label: 'Risks', path: 'risks' },
    ],
    editRoute: 'plan-of-action-and-milestones-edit',
  },
};

// Record frames pass their own props to every tab (e.g. assessment results); this tab doesn't use them.
defineOptions({ inheritAttrs: false });

const route = useRoute();
const router = useRouter();
const toast = useToast();
const api = useAuthenticatedInstance();
const kind = KINDS[String(route.name)]!;
const id = String(route.params.id);
const base = `${kind.endpoint}/${id}`;

type Doc = {
  uuid: string;
  metadata?: Record<string, string | undefined>;
  importSsp?: { href?: string; remarks?: string };
  importAp?: { href?: string; remarks?: string };
};
const doc = useApiQuery<Doc>(base);
const countQueries = kind.counts.map((count) => ({
  ...count,
  query: useApiQuery<unknown[]>(`${base}/${count.path}`),
}));

const date = (value?: string) => (value ? formatDateTime(value) : '');
const details = computed(() => {
  const d = doc.data.value;
  const m = d?.metadata ?? {};
  return d
    ? [
        { key: 'title', label: 'Title', value: m.title },
        { key: 'version', label: 'Version', value: m.version },
        { key: 'published', label: 'Published', value: date(m.published) },
        {
          key: 'modified',
          label: 'Last modified',
          value: date(m.lastModified),
        },
        { key: 'oscal', label: 'OSCAL version', value: m.oscalVersion },
        { key: 'uuid', label: 'UUID', value: d.uuid },
        { key: 'remarks', label: 'Remarks', value: m.remarks },
      ]
    : [];
});
const imported = computed(() => {
  const ref = kind.importKey ? doc.data.value?.[kind.importKey] : undefined;
  return ref
    ? [
        { key: 'href', label: 'Reference', value: ref.href },
        { key: 'remarks', label: 'Remarks', value: ref.remarks },
      ]
    : [];
});
const counts = computed(() =>
  countQueries.map((count) => ({
    key: count.path,
    label: count.label,
    value: count.query.data.value?.length ?? 0,
  })),
);

const confirmDelete = ref(false);
async function remove(): Promise<void> {
  const title = doc.data.value?.metadata?.title ?? `This ${kind.noun}`;
  try {
    await api.delete(base);
    toast.add({
      severity: 'success',
      summary: 'Deleted',
      detail: `${title} was deleted.`,
      life: 3000,
    });
    void router.push({ name: kind.deleteTo! });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: `The ${kind.noun} wasn't deleted`,
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}
</script>

<template>
  <DataState
    :status="doc.status.value"
    :subject="`this ${kind.noun}`"
    skeleton="panel"
    @retry="doc.retry"
  >
    <Stack gap="5">
      <Cluster v-if="kind.editRoute || kind.deleteTo" gap="2">
        <Button
          v-if="kind.editRoute"
          icon="edit"
          :to="{ name: kind.editRoute, params: { id } }"
          >Edit details</Button
        >
        <Button
          v-if="kind.deleteTo"
          variant="danger"
          icon="delete"
          @click="confirmDelete = true"
          >Delete</Button
        >
      </Cluster>
      <Panel title="Details" :level="2">
        <DescriptionList :items="details" />
      </Panel>
      <Panel v-if="imported.length" :title="kind.importLabel" :level="2">
        <DescriptionList :items="imported" />
      </Panel>
      <Panel title="Contents" :level="2">
        <DescriptionList :items="counts" />
      </Panel>
    </Stack>
  </DataState>

  <ConfirmDialog
    v-if="kind.deleteTo"
    v-model:open="confirmDelete"
    :title="`Delete ${doc.data.value?.metadata?.title ?? `this ${kind.noun}`}?`"
    :confirm-label="`Delete ${kind.noun}`"
    @confirm="remove"
    ><Text>This can't be undone.</Text></ConfirmDialog
  >
</template>
