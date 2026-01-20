<script setup lang="ts">
import type { SystemComponent } from '@/oscal';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { FilterParser } from '@/parsers/labelfilter.ts';
import type { Dashboard } from '@/stores/filters.ts';
import FormInput from '@/components/forms/FormInput.vue';
import type { Evidence, EvidenceLabel } from '@/stores/evidence.ts';
import Select from '@/volt/Select.vue';
import BurgerMenu from '@/components/BurgerMenu.vue';
import { useToggle } from '@/composables/useToggle';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import Button from '@/volt/Button.vue';
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

const { execute: fetchEvidenceForLabels } = useDataApi<Evidence[]>(
  '/api/evidence/search',
  {
    method: 'POST',
  },
  { immediate: false },
);

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
    const res = await fetchEvidenceForLabels({
      data: { filter: {} },
    });
    const evidenceList = res.data.value?.data || res.data.value || [];
    availableEvidence.value = (evidenceList as Evidence[])
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
      summary: 'Error Loading Dashboards',
      detail:
        error instanceof Error
          ? error.message
          : 'Failed to load dashboards. Please try again later.',
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
      summary: 'Dashboard Linked',
      detail: `Dashboard "${dashboard.name}" linked to this component.`,
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
      summary: 'Error Linking Dashboard',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error linking dashboard.',
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
      summary: 'Dashboard Unlinked',
      detail: `Dashboard "${dashboard.name}" removed from this component.`,
      life: 3000,
    });
    await loadDashboardsForComponent();
    await loadAllDashboards();
  } catch (error) {
    console.error(error);
    toast.add({
      severity: 'error',
      summary: 'Error Unlinking Dashboard',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error unlinking dashboard.',
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
      summary: 'Invalid Dashboard Filter',
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
      detail: 'Please provide a name for the evidence dashboard.',
      life: 3000,
    });
    return;
  }
  if (!evidenceDashboard.value.filter?.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: 'Please build a label filter before creating the dashboard.',
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
      detail: 'Evidence dashboard created successfully.',
      life: 3000,
    });
    // Refresh dashboards list and reset form for next entry
    await loadDashboardsForComponent();
    resetEvidenceLinkingForm();
  } catch (error) {
    console.error(error);
    toast.add({
      severity: 'error',
      summary: 'Error Creating Evidence Dashboard',
      detail:
        error instanceof Error
          ? error.message
          : 'Unexpected error creating evidence dashboard.',
      life: 3000,
    });
  }
}
</script>

<template>
  <!-- Evidence Linking Section -->
  <div class="mt-8">
    <div class="flex items-center mb-4 gap-x-4">
      <h5 class="font-medium text-xl">Evidence Linking</h5>
      <BurgerMenu
        :items="[
          {
            label: 'Create New Dashboard',
            command: () => {
              setLinkExistingForm(false);
              setEvidenceLinkingForm(true);
            },
          },
          {
            label: 'Link Existing Dashboard',
            command: () => {
              setEvidenceLinkingForm(false);
              setLinkExistingForm(true);
            },
          },
        ]"
      />
    </div>

    <!-- Existing Dashboards List -->
    <div v-if="existingDashboards.length > 0" class="mb-6">
      <h6 class="text-sm font-medium text-gray-500 mb-2">Linked Dashboards</h6>
      <div class="space-y-2">
        <div
          v-for="dashboard in existingDashboards"
          :key="dashboard.id"
          class="p-3 bg-gray-50 dark:bg-slate-800 rounded-md flex items-center justify-between gap-4"
        >
          <span class="font-medium">{{ dashboard.name }}</span>
          <div class="flex items-center gap-3">
            <DashboardEvidenceCounter :dashboard-id="dashboard.id!" />
            <Button
              type="button"
              severity="secondary"
              text
              size="small"
              @click="viewDashboardEvidence(dashboard)"
              class="text-blue-600 hover:text-blue-800"
            >
              View Evidence
            </Button>
            <Button
              type="button"
              severity="danger"
              text
              size="small"
              @click="unlinkDashboard(dashboard)"
              class="text-red-500 hover:text-red-700"
            >
              Unlink
            </Button>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="dashboardsLoading" class="mb-6 text-sm text-gray-500">
      Loading dashboards...
    </div>
    <div
      v-else-if="
        showEvidenceLinkingForm === false && showLinkExistingForm === false
      "
      class="mb-6 text-sm text-gray-500"
    >
      No dashboards linked to this component yet.
    </div>

    <!-- Link Existing Dashboard Form -->
    <form @submit.prevent="linkExistingDashboard" v-if="showLinkExistingForm">
      <div class="h-0.5 dark:bg-slate-800 bg-gray-400 w-full my-4"></div>
      <div class="flex justify-between items-center mb-4">
        <h4 class="m-0">Link Existing Dashboard</h4>
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2 text-sm font-medium"
          >Select Dashboard</label
        >
        <Select
          v-model="selectedDashboardToLink"
          :options="availableDashboardsToLink"
          optionLabel="name"
          filter
          placeholder="Select a dashboard to link..."
          class="w-full"
        />
      </div>
      <div class="text-right">
        <secondary-button
          @click="
            setLinkExistingForm(false);
            selectedDashboardToLink = null;
          "
          >Cancel</secondary-button
        >
        <primary-button type="submit" :disabled="!selectedDashboardToLink"
          >Link Dashboard</primary-button
        >
      </div>
    </form>

    <!-- New Dashboard Form -->
    <form
      @submit.prevent="submitEvidenceLinking"
      v-if="showEvidenceLinkingForm"
    >
      <div class="h-0.5 dark:bg-slate-800 bg-gray-400 w-full my-4"></div>
      <div class="flex justify-between items-center mb-4">
        <h4 class="m-0">New Evidence Dashboard</h4>
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2 text-sm font-medium">Name</label>
        <FormInput
          v-model="evidenceDashboard.name"
          placeholder="Dashboard name"
        />
      </div>

      <!-- Baseline Evidence Selection (single select) -->
      <div class="mb-4">
        <label class="inline-block pb-2 text-sm font-medium"
          >Select Baseline Evidence</label
        >
        <div class="flex flex-col gap-2">
          <Select
            v-model="selectedBaselineEvidence"
            :options="availableEvidence"
            optionLabel="title"
            filter
            :filterFields="['title', 'searchText']"
            placeholder="Select an evidence as baseline..."
            :loading="evidenceLoading"
            class="w-full"
          >
            <template #option="slotProps">
              <div class="flex flex-col">
                <span class="font-medium">{{ slotProps.option.title }}</span>
                <span class="text-xs text-gray-500 dark:text-slate-400">
                  {{
                    slotProps.option.labels
                      ?.map((l: EvidenceLabel) => `${l.name}=${l.value}`)
                      .join(', ')
                  }}
                </span>
              </div>
            </template>
          </Select>
        </div>
      </div>

      <!-- Label Query Builder -->
      <div class="mb-4" v-if="selectedBaselineEvidence">
        <label class="inline-block pb-2 text-sm font-medium"
          >Label Conditions</label
        >

        <!-- Current conditions -->
        <div v-if="labelConditions.length > 0" class="mb-3 space-y-2">
          <div
            v-for="(condition, index) in labelConditions"
            :key="index"
            class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-slate-800 rounded-md"
          >
            <span class="text-sm font-mono flex-1"
              >{{ condition.name }}={{ condition.value }}</span
            >
            <Button
              type="button"
              severity="danger"
              text
              size="small"
              @click="removeLabelCondition(index)"
              class="text-red-500 hover:text-red-700"
            >
              Remove
            </Button>
          </div>
        </div>

        <!-- Add new condition -->
        <div class="flex gap-2 items-end">
          <div class="flex-1">
            <label class="text-xs text-gray-500 dark:text-slate-400"
              >Label Name</label
            >
            <Select
              v-model="newLabelName"
              :options="availableLabelNames"
              placeholder="Select label..."
              class="w-full"
            />
          </div>
          <div class="flex-1">
            <label class="text-xs text-gray-500 dark:text-slate-400"
              >Value</label
            >
            <Select
              v-model="newLabelValue"
              :options="availableLabelValues"
              placeholder="Select value..."
              :disabled="!newLabelName"
              class="w-full"
            />
          </div>
          <Button
            type="button"
            severity="secondary"
            @click="addLabelCondition"
            :disabled="!newLabelName || !newLabelValue"
          >
            Add
          </Button>
        </div>
      </div>

      <!-- Generated Filter Preview -->
      <div class="mb-4" v-if="computedFilter">
        <label class="inline-block pb-2 text-sm font-medium"
          >Generated Filter</label
        >
        <div
          class="p-3 bg-gray-100 dark:bg-slate-800 rounded-md text-sm font-mono break-all"
        >
          {{ computedFilter }}
        </div>
      </div>

      <div class="text-right">
        <secondary-button @click="resetEvidenceLinkingForm"
          >Cancel</secondary-button
        >
        <primary-button type="submit" :disabled="!computedFilter"
          >Create Dashboard</primary-button
        >
      </div>
    </form>
  </div>
</template>
