<script setup lang="ts">
import type { SystemComponent } from '@/oscal';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { FilterParser } from '@/parsers/labelfilter.ts';
import type { Dashboard } from '@/stores/filters.ts';
import type { Evidence } from '@/stores/evidence.ts';
import { useToggle } from '@/composables/useToggle';
import { useBaselineEvidence } from '@/composables/useBaselineEvidence';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from '@/ds/toasts';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Cluster from '@/ds/components/layout/Cluster.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import DashboardLinkForm from '@/views/control-implementations/partials/DashboardLinkForm.vue';
import EvidenceDashboardForm from '@/views/control-implementations/partials/EvidenceDashboardForm.vue';
import DashboardEvidenceCounter from '@/views/control-implementations/partials/DashboardEvidenceCounter.vue';

const toast = useToast();
const router = useRouter();

const { value: showEvidenceLinkingForm, set: setEvidenceLinkingForm } =
  useToggle(false);
const evidenceDashboard = ref<{ name: string; filter: string }>({
  name: '',
  filter: '',
});

const { sspId, component } = defineProps<{
  sspId: string;
  component: SystemComponent;
}>();

// Evidence selection state with searchText for filtering
interface SearchableEvidence extends Evidence {
  searchText: string;
}
const availableEvidence = ref<SearchableEvidence[]>([]);
const selectedBaselineEvidence = ref<SearchableEvidence | null>(null);
const evidenceLoading = ref(false);

// Label query builder state
interface LabelCondition {
  name: string;
  value: string;
}
const labelConditions = ref<LabelCondition[]>([]);
const newLabelName = ref('');
const newLabelValue = ref('');

// Existing dashboards for this component
type DashboardWithComponents = Dashboard;
const existingDashboards = ref<DashboardWithComponents[]>([]);
const allDashboards = ref<DashboardWithComponents[]>([]);
const dashboardsLoading = ref(false);

// Link existing dashboard state
const { value: showLinkExistingForm, set: setLinkExistingForm } =
  useToggle(false);
const selectedDashboardToLink = ref<DashboardWithComponents | null>(null);

const { execute: createEvidenceDashboard } = useDataApi<Dashboard>(
  '/api/filters',
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const { fetchBaselineEvidence } = useBaselineEvidence(() => sspId);

const { execute: fetchDashboardsByComponent } = useDataApi<
  DashboardWithComponents[]
>('/api/filters', {}, { immediate: false });

const { execute: fetchAllDashboards } = useDataApi<DashboardWithComponents[]>(
  '/api/filters',
  {},
  { immediate: false },
);

const { execute: updateDashboard } = useDataApi<Dashboard>(
  null,
  {
    method: 'PUT',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

onMounted(() => {
  if (!sspId) {
    return;
  }
  // Load existing dashboards for this component
  loadDashboardsForComponent();
});

function resetEvidenceLinkingForm() {
  setEvidenceLinkingForm(false);
  evidenceDashboard.value = { name: '', filter: '' };
  selectedBaselineEvidence.value = null;
  labelConditions.value = [];
  newLabelName.value = '';
  newLabelValue.value = '';
}

async function loadAvailableEvidence(forceReload = false) {
  if (!forceReload && availableEvidence.value.length > 0) return; // Already loaded
  evidenceLoading.value = true;
  try {
    const evidenceList = await fetchBaselineEvidence();
    availableEvidence.value = evidenceList
      .filter((ev) => ev.labels && ev.labels.length > 0)
      .map((ev) => ({
        ...ev,
        searchText: [
          ev.title,
          ...(ev.labels?.map((l) => `${l.name} ${l.value}`) || []),
        ].join(' '),
      }));
  } catch (error) {
    console.error('Failed to load evidence:', error);
    toast.add({
      severity: 'error',
      summary: 'Failed to load evidence',
      detail: 'Evidence could not be loaded. Please try again later.',
      life: 3000,
    });
  } finally {
    evidenceLoading.value = false;
  }
}

/**
 * Fetches dashboards linked to the current component.
 */
async function loadDashboardsForComponent() {
  dashboardsLoading.value = true;
  try {
    const res = await fetchDashboardsByComponent({
      params: {
        componentId: component?.uuid,
      },
    });
    const dashboardList = res.data.value?.data || res.data.value || [];
    existingDashboards.value = dashboardList as DashboardWithComponents[];
  } catch (error) {
    console.error('Failed to load dashboards:', error);
  } finally {
    dashboardsLoading.value = false;
  }
}

async function loadAllDashboards() {
  try {
    const res = await fetchAllDashboards();
    const dashboardList = res.data.value?.data || res.data.value || [];
    allDashboards.value = dashboardList as DashboardWithComponents[];
  } catch (error) {
    console.error('Failed to load all dashboards:', error);
    toast.add({
      severity: 'error',
      summary: 'Error Loading Evidence Filters',
      detail:
        error instanceof Error
          ? error.message
          : 'Failed to load evidence filters. Please try again later.',
      life: 3000,
    });
  }
}

// Dashboards available for linking (not already linked to this component or any controls)
const availableDashboardsToLink = computed(() => {
  const componentId = component.uuid;
  return allDashboards.value.filter(
    (dashboard) =>
      !dashboard.components?.some(
        (component) => component.uuid === componentId,
      ) && !dashboard.controls?.length,
  );
});

async function linkExistingDashboard() {
  if (!selectedDashboardToLink.value) return;

  const dashboard = selectedDashboardToLink.value;
  const componentId = component.uuid;

  // Add current component to the dashboard's components
  const existingComponentIds = dashboard.components?.map((c) => c.uuid) || [];
  const newComponentIds = [...existingComponentIds, componentId];

  try {
    await updateDashboard(`/api/filters/${dashboard.id}`, {
      data: {
        name: dashboard.name,
        filter: dashboard.filter,
        components: newComponentIds,
      },
    });
    toast.add({
      severity: 'success',
      summary: 'Evidence Filter Linked',
      detail: `Evidence filter "${dashboard.name}" linked to this component.`,
      life: 3000,
    });
    // Refresh and reset
    await loadDashboardsForComponent();
    await loadAllDashboards();
    selectedDashboardToLink.value = null;
    setLinkExistingForm(false);
  } catch (error) {
    console.error(error);
    toast.add({
      severity: 'error',
      summary: 'Error Linking Evidence Filter',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error linking evidence filter.',
      life: 3000,
    });
  }
}

async function unlinkDashboard(dashboard: DashboardWithComponents) {
  const componentId = component.uuid;

  // Remove current components from the dashboard's components
  const newComponentIds =
    dashboard.components
      ?.filter((c) => c.uuid !== componentId)
      .map((c) => c.uuid) || [];

  try {
    await updateDashboard(`/api/filters/${dashboard.id}`, {
      data: {
        name: dashboard.name,
        filter: dashboard.filter,
        components: newComponentIds,
      },
    });
    toast.add({
      severity: 'success',
      summary: 'Evidence Filter Unlinked',
      detail: `Evidence filter "${dashboard.name}" removed from this component.`,
      life: 3000,
    });
    await loadDashboardsForComponent();
    await loadAllDashboards();
  } catch (error) {
    console.error(error);
    toast.add({
      severity: 'error',
      summary: 'Error Unlinking Evidence Filter',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error unlinking evidence filter.',
      life: 3000,
    });
  }
}

// Convert a Filter object back to a string for URL query params
function filterToString(
  filter: import('@/parsers/labelfilter.ts').Filter | undefined,
): string {
  function scopeToString(
    scope: import('@/parsers/labelfilter.ts').Scope | undefined,
    path = 'scope',
  ): string {
    if (!scope) {
      throw new Error(`Invalid filter: missing ${path}.`);
    }

    if (scope.condition) {
      const { label, operator, value } = scope.condition;
      if (
        !label ||
        !operator ||
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.length === 0)
      ) {
        throw new Error(`Malformed condition at ${path}.`);
      }
      return `${label}${operator}${value}`;
    }

    if (scope.query) {
      const operator =
        scope.query.operator && scope.query.operator.trim().length > 0
          ? scope.query.operator
          : 'and';
      const scopes = scope.query.scopes?.filter(Boolean) ?? [];
      if (!scopes.length) {
        throw new Error(`Query at ${path} has no scopes.`);
      }
      const parts = scopes.map((childScope, index) =>
        scopeToString(childScope, `${path}.query.scopes[${index}]`),
      );
      const joined = parts.join(` ${operator} `);
      return parts.length > 1 ? `(${joined})` : joined;
    }

    throw new Error(`Scope at ${path} is missing both condition and query.`);
  }

  if (!filter || !filter.scope) {
    throw new Error('Filter is missing a valid scope.');
  }

  return scopeToString(filter.scope);
}

function viewDashboardEvidence(dashboard: DashboardWithComponents) {
  try {
    const filterString = filterToString(dashboard.filter);
    router.push({ name: 'evidence:index', query: { filter: filterString } });
  } catch (error) {
    console.error('Unable to build dashboard filter string.', error);
    toast.add({
      severity: 'error',
      summary: 'Invalid Evidence Filter',
      detail:
        error instanceof Error
          ? error.message
          : 'Unable to open evidence because the filter is invalid.',
      life: 4000,
    });
  }
}

// Available label names from selected baseline evidence
const availableLabelNames = computed(() => {
  if (!selectedBaselineEvidence.value?.labels) return [];
  const names = new Set(
    selectedBaselineEvidence.value.labels.map((l) => l.name),
  );
  return Array.from(names).sort();
});

// Filter evidence that matches all current label conditions
const filteredEvidenceByConditions = computed(() => {
  if (labelConditions.value.length === 0) return availableEvidence.value;
  return availableEvidence.value.filter((ev) => {
    if (!ev.labels) return false;
    // Evidence must have ALL current label conditions
    return labelConditions.value.every((condition) =>
      ev.labels?.some(
        (l) => l.name === condition.name && l.value === condition.value,
      ),
    );
  });
});

// Available values for the selected label name (from evidence matching current conditions)
const availableLabelValues = computed(() => {
  if (!newLabelName.value) return [];
  const values = new Set<string>();
  for (const ev of filteredEvidenceByConditions.value) {
    if (ev.labels) {
      for (const label of ev.labels) {
        if (label.name === newLabelName.value) {
          values.add(label.value);
        }
      }
    }
  }
  return Array.from(values).sort();
});

// Build filter string from label conditions
const computedFilter = computed(() => {
  if (labelConditions.value.length === 0) return '';
  return labelConditions.value.map((c) => `${c.name}=${c.value}`).join(' and ');
});

// Sync computed filter to evidenceDashboard
watch(computedFilter, (filter) => {
  evidenceDashboard.value.filter = filter;
});

function addLabelCondition() {
  if (!newLabelName.value || !newLabelValue.value) return;
  // Avoid duplicates
  const exists = labelConditions.value.some(
    (c) => c.name === newLabelName.value && c.value === newLabelValue.value,
  );
  if (!exists) {
    labelConditions.value.push({
      name: newLabelName.value,
      value: newLabelValue.value,
    });
  }
  newLabelName.value = '';
  newLabelValue.value = '';
}

function removeLabelCondition(index: number) {
  labelConditions.value.splice(index, 1);
}

watch(showEvidenceLinkingForm, async (show) => {
  if (show) {
    await Promise.all([
      loadAvailableEvidence(true),
      loadDashboardsForComponent(),
      loadAllDashboards(),
    ]);
  }
});

watch(showLinkExistingForm, async (show) => {
  if (show) {
    await Promise.all([loadDashboardsForComponent(), loadAllDashboards()]);
  }
});

async function submitEvidenceLinking() {
  if (!evidenceDashboard.value.name) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please provide a name for the evidence filter.',
      life: 3000,
    });
    return;
  }
  if (!evidenceDashboard.value.filter?.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail:
        'Please build a label filter before creating the evidence filter.',
      life: 3000,
    });
    return;
  }
  const componentIds = [component.uuid];
  let parsedFilter;
  try {
    parsedFilter = new FilterParser(
      evidenceDashboard.value.filter.trim(),
    ).parse();
  } catch (parseError) {
    console.error(
      'Failed to parse label filter for evidence dashboard:',
      parseError,
    );
    toast.add({
      severity: 'error',
      summary: 'Invalid Label Filter',
      detail:
        'The label filter you entered is invalid. Please check its syntax and try again.',
      life: 3000,
    });
    return;
  }
  try {
    await createEvidenceDashboard({
      data: {
        name: evidenceDashboard.value.name,
        filter: parsedFilter,
        components: componentIds,
      },
    });
    toast.add({
      severity: 'success',
      summary: 'Evidence Linked',
      detail: 'Evidence filter created successfully.',
      life: 3000,
    });
    // Refresh dashboards list and reset form for next entry
    await loadDashboardsForComponent();
    resetEvidenceLinkingForm();
  } catch (error) {
    console.error(error);
    toast.add({
      severity: 'error',
      summary: 'Error Creating Evidence Filter',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error creating evidence filter.',
      life: 3000,
    });
  }
}

const DASHBOARD_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Evidence filter', minWidth: 'sm' },
  { key: 'evidence', label: 'Evidence' },
];
const dashboardActions = (dashboard: DashboardWithComponents): MenuEntry[] => [
  {
    label: 'View evidence',
    icon: 'evidence',
    onSelect: () => viewDashboardEvidence(dashboard),
  },
  {
    label: 'Unlink',
    icon: 'delete',
    tone: 'danger',
    onSelect: () => void unlinkDashboard(dashboard),
  },
];
</script>

<template>
  <PanelSection title="Linked evidence filters" :level="3">
    <template #actions>
      <Cluster gap="2">
        <Button
          icon="link"
          @click="
            setEvidenceLinkingForm(false);
            setLinkExistingForm(true);
          "
          >Link existing filter</Button
        >
        <Button
          icon="add"
          @click="
            setLinkExistingForm(false);
            setEvidenceLinkingForm(true);
          "
          >New evidence filter</Button
        >
      </Cluster>
    </template>
    <DataState
      :status="
        existingDashboards.length
          ? 'ready'
          : dashboardsLoading
            ? 'loading'
            : 'empty'
      "
      subject="evidence filters"
      empty-title="No evidence filters linked"
      empty-body="Link an evidence filter, or create one from a piece of evidence, to show this component's evidence."
      icon="evidence"
    >
      <DataTable
        caption="Linked evidence filters"
        caption-hidden
        :columns="DASHBOARD_COLUMNS"
        :rows="existingDashboards"
        :row-key="(d) => d.id!"
      >
        <template #cell-evidence="{ row: dashboard }">
          <DashboardEvidenceCounter :dashboard-id="dashboard.id!" />
        </template>
        <template #actions="{ row: dashboard }">
          <Menu
            :label="`Actions for ${dashboard.name}`"
            :items="dashboardActions(dashboard)"
          />
        </template>
      </DataTable>
    </DataState>
  </PanelSection>

  <Dialog v-model:open="showLinkExistingForm" title="Link evidence filter">
    <DashboardLinkForm
      v-if="showLinkExistingForm"
      v-model:selected-dashboard="selectedDashboardToLink"
      :dashboards="availableDashboardsToLink"
      @submit="linkExistingDashboard"
      @cancel="
        setLinkExistingForm(false);
        selectedDashboardToLink = null;
      "
    />
  </Dialog>
  <Dialog
    v-model:open="showEvidenceLinkingForm"
    title="New evidence filter"
    size="l"
  >
    <EvidenceDashboardForm
      v-if="showEvidenceLinkingForm"
      v-model:name="evidenceDashboard.name"
      v-model:selected-baseline-evidence="selectedBaselineEvidence"
      v-model:new-label-name="newLabelName"
      v-model:new-label-value="newLabelValue"
      :unique-evidence-titles="availableEvidence"
      :evidence-loading="evidenceLoading"
      :label-conditions="labelConditions"
      :available-label-names="availableLabelNames"
      :available-label-values="availableLabelValues"
      :computed-filter="computedFilter"
      @submit="submitEvidenceLinking"
      @cancel="resetEvidenceLinkingForm"
      @add-condition="addLabelCondition"
      @remove-condition="removeLabelCondition"
    />
  </Dialog>
</template>
