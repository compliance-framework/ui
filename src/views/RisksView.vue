<template>
  <div v-if="loading" class="text-center py-8">
    <p class="text-gray-500 dark:text-slate-400">Loading risks...</p>
  </div>

  <Message v-else-if="contextMissing" severity="error" variant="outlined">
    <div class="space-y-2 text-gray-700 dark:text-slate-200">
      <h4 class="text-base font-semibold">{{ missingContextTitle }}</h4>
      <p>{{ missingContextDetail }}</p>
      <p>
        Please return to the
        <RouterLink
          :to="{ name: missingContextRouteName }"
          class="font-medium underline text-blue-600 dark:text-blue-300"
          >{{ missingContextRouteLabel }}
        </RouterLink>
        to select one
      </p>
    </div>
  </Message>

  <div v-else-if="error" class="text-center py-8">
    <p class="text-red-500">Error loading risks: {{ error }}</p>
  </div>

  <div v-else class="p-6 space-y-6">
    <PageHeader>{{ pageTitle }}</PageHeader>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
      >
        <p
          class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
        >
          Total Risks
        </p>
        <p
          class="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100"
        >
          {{ riskSummary.total }}
        </p>
      </div>

      <div
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
      >
        <p
          class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
        >
          Open Risks
        </p>
        <p
          class="mt-2 text-2xl font-semibold text-amber-700 dark:text-amber-300"
        >
          {{ riskSummary.open }}
        </p>
      </div>

      <div
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
      >
        <p
          class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
        >
          Accepted Risks
        </p>
        <p
          class="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-300"
        >
          {{ riskSummary.accepted }}
        </p>
      </div>

      <div
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
      >
        <p
          class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
        >
          Overdue Reviews
        </p>
        <p class="mt-2 text-2xl font-semibold text-red-700 dark:text-red-300">
          {{ riskSummary.overdueReviews }}
        </p>
      </div>
    </div>

    <div
      class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4 space-y-4"
    >
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Search
          </label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Title, status, owner..."
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          />
        </div>

        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Status
          </label>
          <select
            v-model="filters.status"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All</option>
            <option
              v-for="status in statusOptions"
              :key="status"
              :value="status"
            >
              {{ formatLabel(status) }}
            </option>
          </select>
        </div>

        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Likelihood
          </label>
          <select
            v-model="filters.likelihood"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Impact
          </label>
          <select
            v-model="filters.impact"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Owner
          </label>
          <input
            v-model="filters.owner"
            type="text"
            placeholder="Name, email or ID"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          />
        </div>

        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Review Deadline
          </label>
          <select
            v-model="filters.review"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </div>

        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Control ID
          </label>
          <input
            v-model="filters.controlId"
            type="text"
            placeholder="Filter by control"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          />
        </div>

        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Evidence ID
          </label>
          <input
            v-model="filters.evidenceId"
            type="text"
            placeholder="Filter by evidence"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          />
        </div>

        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            Sort
          </label>
          <div class="flex gap-2">
            <select
              v-model="sortBy"
              class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="updated">Updated Date</option>
              <option value="created">Created Date</option>
              <option value="review-deadline">Review Deadline</option>
              <option value="status">Status</option>
              <option value="likelihood">Likelihood</option>
              <option value="impact">Impact</option>
            </select>
            <select
              v-model="sortDirection"
              class="w-28 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>
      </div>

      <div class="flex justify-end">
        <TertiaryButton @click="resetFilters">Reset Filters</TertiaryButton>
      </div>
    </div>

    <div class="flex justify-between items-center">
      <PrimaryButton @click="showCreateModal = true">Create Risk</PrimaryButton>
      <p class="text-sm text-gray-500 dark:text-slate-400">
        Showing {{ visibleRisks.length }} of {{ risks?.length || 0 }} risks
      </p>
    </div>

    <div v-if="!visibleRisks.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No risks found.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="risk in visibleRisks"
        :key="risk.uuid"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
      >
        <div class="flex flex-col lg:flex-row gap-4 lg:justify-between">
          <div class="flex-1 space-y-3">
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-slate-300">
                {{ risk.title || 'Untitled Risk' }}
              </h3>
              <p class="text-gray-600 dark:text-slate-400 mt-1">
                {{ risk.description || 'No description provided.' }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2 items-center">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="statusBadgeClass(risk.status)"
              >
                {{ formatLabel(risk.status || 'unknown') }}
              </span>

              <span
                v-if="risk.threatIds?.length"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              >
                {{ risk.threatIds.length }} Threats
              </span>

              <span
                v-if="riskEvidenceCount(risk)"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
              >
                {{ riskEvidenceCount(risk) }} Evidence
              </span>

              <span
                v-if="riskControlCount(risk)"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
              >
                {{ riskControlCount(risk) }} Controls
              </span>

              <span
                v-if="riskComponentCount(risk)"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
              >
                {{ riskComponentCount(risk) }} Components
              </span>
            </div>

            <div
              class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm"
            >
              <div>
                <p class="text-gray-500 dark:text-slate-400">Owner</p>
                <p class="text-gray-700 dark:text-slate-200">
                  {{ riskOwner(risk) || 'Unassigned' }}
                </p>
              </div>
              <div>
                <p class="text-gray-500 dark:text-slate-400">Likelihood</p>
                <p class="text-gray-700 dark:text-slate-200">
                  {{ formatLabel(riskLikelihood(risk) || 'unknown') }}
                </p>
              </div>
              <div>
                <p class="text-gray-500 dark:text-slate-400">Impact</p>
                <p class="text-gray-700 dark:text-slate-200">
                  {{ formatLabel(riskImpact(risk) || 'unknown') }}
                </p>
              </div>
              <div>
                <p class="text-gray-500 dark:text-slate-400">Review Deadline</p>
                <p
                  class="text-gray-700 dark:text-slate-200"
                  :class="{
                    'text-red-600 dark:text-red-300': isReviewOverdue(risk),
                  }"
                >
                  {{ formatDateTime(riskReviewDeadline(risk)) }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex gap-2 self-start">
            <RouterLinkButton
              v-if="risk.uuid"
              variant="text"
              :to="riskDetailRoute(risk.uuid)"
            >
              Open
            </RouterLinkButton>
            <TertiaryButton @click="editRisk(risk)">Edit</TertiaryButton>
            <TertiaryButton
              v-if="risk.uuid"
              @click="
                confirmDeleteDialog(() => deleteRisk(risk.uuid!), {
                  itemType: 'risk',
                })
              "
            >
              Delete
            </TertiaryButton>
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="showCreateModal" modal size="lg">
      <RiskCreateForm
        :poam-id="context?.scope === 'poam' ? context.id : undefined"
        :ssp-id="context?.scope === 'ssp' ? context.id : undefined"
        @cancel="showCreateModal = false"
        @created="handleRiskCreated"
      />
    </Dialog>

    <Dialog v-model:visible="showEditModal" modal size="lg">
      <RiskEditForm
        v-if="editingRisk"
        :poam-id="context?.scope === 'poam' ? context.id : undefined"
        :ssp-id="context?.scope === 'ssp' ? context.id : undefined"
        :risk="editingRisk"
        @cancel="showEditModal = false"
        @saved="handleRiskSaved"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { type Risk } from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import RiskCreateForm from '@/components/poam/RiskCreateForm.vue';
import RiskEditForm from '@/components/poam/RiskEditForm.vue';
import { useToast } from 'primevue/usetoast';
import PageHeader from '@/components/PageHeader.vue';
import { useSystemStore } from '@/stores/system.ts';
import { useDataApi } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import {
  buildRiskCollectionEndpoint,
  buildRiskItemEndpoint,
  resolveRiskContext,
  type RiskContext,
} from '@/utils/risk-context';
import {
  computeRiskSummary,
  defaultRiskFilters,
  filterRisks,
  getRiskComponentIds,
  getRiskControlIds,
  getRiskEvidenceIds,
  getRiskImpact,
  getRiskLikelihood,
  getRiskOwnerDisplay,
  getRiskReviewDeadline,
  sortRisks,
  type RiskFilters,
  type RiskSortBy,
  type SortDirection,
} from '@/utils/risk-register';

const route = useRoute();
const toast = useToast();
const { system } = useSystemStore();

const { confirmDeleteDialog } = useDeleteConfirmationDialog();

const context = computed<RiskContext | null>(() =>
  resolveRiskContext({
    routeName: route.name,
    routeId: (route.params.id as string | undefined) ?? null,
    selectedPoamId: system.poam?.uuid,
    selectedSspId: system.securityPlan?.uuid,
  }),
);

const contextMissing = computed(() => !context.value);
const isSspRoute = computed(
  () =>
    route.name === 'system-security-plan-risks' ||
    route.name === 'system-security-plan-risk-detail',
);

const missingContextTitle = computed(() =>
  isSspRoute.value
    ? 'System Security Plan not selected'
    : 'Plan Of Action and Milestones not selected',
);
const missingContextDetail = computed(() =>
  isSspRoute.value
    ? 'No System Security Plan has been selected for editing.'
    : 'No Plan Of Action and Milestones (POA&M) has been selected for editing.',
);
const missingContextRouteName = computed(() =>
  isSspRoute.value ? 'system-security-plans' : 'plan-of-action-and-milestones',
);
const missingContextRouteLabel = computed(() =>
  isSspRoute.value ? 'SSP Page' : 'POA&M Page',
);

const pageTitle = computed(() =>
  context.value?.scope === 'ssp' ? 'SSP Risk Register' : 'Risk Register',
);

const endpoint = computed(() => {
  if (!context.value) return null;
  return buildRiskCollectionEndpoint(context.value);
});

const {
  data: risks,
  error,
  isLoading: loading,
  execute: loadRisks,
} = useDataApi<Risk[]>(null, {}, { immediate: false });

watch(
  endpoint,
  async (value) => {
    if (!value) {
      risks.value = [];
      return;
    }
    await loadRisks(value);
  },
  { immediate: true },
);

interface RiskUpdatedDetail {
  risk: Risk;
  context?: { scope: 'poam' | 'ssp'; id: string };
  poamId?: string;
  sspId?: string;
}

const handleRiskUpdated = (event: Event) => {
  const detail = (event as CustomEvent<RiskUpdatedDetail>).detail;
  if (!detail?.risk?.uuid || !risks.value || !context.value) return;

  if (
    detail.context &&
    (detail.context.scope !== context.value.scope ||
      detail.context.id !== context.value.id)
  ) {
    return;
  }

  if (detail.poamId && detail.poamId !== context.value.id) return;
  if (detail.sspId && detail.sspId !== context.value.id) return;

  const index = risks.value.findIndex((item) => item.uuid === detail.risk.uuid);
  if (index !== -1) {
    risks.value[index] = detail.risk;
  }
};

onMounted(() => {
  window.addEventListener('risk-updated', handleRiskUpdated as EventListener);
});

onUnmounted(() => {
  window.removeEventListener(
    'risk-updated',
    handleRiskUpdated as EventListener,
  );
});

const { execute: executeDeleteRisk } = useDataApi<void>(
  null,
  { method: 'DELETE' },
  { immediate: false },
);

const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingRisk = ref<Risk | null>(null);

const filters = reactive<RiskFilters>({ ...defaultRiskFilters });
const sortBy = ref<RiskSortBy>('updated');
const sortDirection = ref<SortDirection>('desc');

const riskSummary = computed(() => computeRiskSummary(risks.value || []));

const filteredRisks = computed(() => filterRisks(risks.value || [], filters));

const visibleRisks = computed(() =>
  sortRisks(filteredRisks.value, sortBy.value, sortDirection.value),
);

const statusOptions = computed(() => {
  const statuses = new Set(
    (risks.value || []).map((risk) => (risk.status || '').toLowerCase()),
  );

  return Array.from(statuses)
    .filter((status) => !!status)
    .sort((left, right) => left.localeCompare(right));
});

const editRisk = (risk: Risk) => {
  editingRisk.value = risk;
  showEditModal.value = true;
};

const handleRiskCreated = (newRisk: Risk) => {
  if (!risks.value) {
    risks.value = [];
  }
  risks.value.push(newRisk);
  showCreateModal.value = false;
};

const handleRiskSaved = (updatedRisk: Risk) => {
  if (!risks.value || !updatedRisk) return;
  const index = risks.value.findIndex((risk) => risk.uuid === updatedRisk.uuid);
  if (index !== -1) {
    risks.value[index] = updatedRisk;
  }
  showEditModal.value = false;
  editingRisk.value = null;
};

const deleteRisk = async (uuid: string) => {
  try {
    if (!context.value) {
      throw new Error('No risk context found.');
    }

    await executeDeleteRisk(buildRiskItemEndpoint(context.value, uuid));
    toast.add({
      severity: 'success',
      summary: 'Risk Deleted',
      detail: 'Risk deleted successfully',
      life: 3000,
    });

    if (endpoint.value) {
      await loadRisks(endpoint.value);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: `Failed to delete risk: ${errorMessage}`,
      life: 5000,
    });
  }
};

function riskDetailRoute(riskId: string) {
  if (!context.value) {
    return { name: 'risks:index' };
  }

  if (context.value.detailRouteName === 'risks:detail') {
    return {
      name: context.value.detailRouteName,
      params: { riskId },
    };
  }

  return {
    name: context.value.detailRouteName,
    params: { id: context.value.id, riskId },
  };
}

function resetFilters() {
  Object.assign(filters, defaultRiskFilters);
  sortBy.value = 'updated';
  sortDirection.value = 'desc';
}

function formatDateTime(value?: string): string {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function formatLabel(value?: string): string {
  if (!value) return 'N/A';
  return value
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function statusBadgeClass(status?: string): string {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('closed') || normalized.includes('resolved')) {
    return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
  }
  if (normalized.includes('accepted')) {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
  }
  if (normalized.includes('open') || normalized.includes('investigating')) {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
  }
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
}

function riskOwner(risk: Risk): string {
  return getRiskOwnerDisplay(risk);
}

function riskLikelihood(risk: Risk): string {
  return getRiskLikelihood(risk);
}

function riskImpact(risk: Risk): string {
  return getRiskImpact(risk);
}

function riskReviewDeadline(risk: Risk): string | undefined {
  return getRiskReviewDeadline(risk);
}

function isReviewOverdue(risk: Risk): boolean {
  const deadline = getRiskReviewDeadline(risk);
  if (!deadline) return false;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function riskEvidenceCount(risk: Risk): number {
  return getRiskEvidenceIds(risk).length;
}

function riskControlCount(risk: Risk): number {
  return getRiskControlIds(risk).length;
}

function riskComponentCount(risk: Risk): number {
  return getRiskComponentIds(risk).length;
}
</script>
