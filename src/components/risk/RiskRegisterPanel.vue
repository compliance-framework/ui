<template>
  <div v-if="loading" class="text-center py-8">
    <p class="text-gray-500 dark:text-slate-400">Loading risks...</p>
  </div>

  <Message v-else-if="contextMissing" severity="error" variant="outlined">
    <div class="space-y-2 text-gray-700 dark:text-slate-200">
      <h4 class="text-base font-semibold">System Security Plan not selected</h4>
      <p>No System Security Plan has been selected for editing.</p>
      <p>
        Please return to the
        <RouterLink
          :to="{ name: 'system-security-plans' }"
          class="font-medium underline text-blue-600 dark:text-blue-300"
          >SSP Page
        </RouterLink>
        to select one
      </p>
    </div>
  </Message>

  <div v-else-if="error" class="text-center py-8">
    <p class="text-red-500">Error loading risks: {{ error }}</p>
  </div>

  <div v-else class="p-6 space-y-6">
    <PageHeader>{{ title }}</PageHeader>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-4"
      >
        <p
          class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
        >
          Active Risks
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
      <div
        v-if="availableSsps && availableSsps.length > 0"
        class="grid grid-cols-1 gap-4"
      >
        <div>
          <label
            class="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1"
          >
            SSP
          </label>
          <select
            v-model="filters.sspId"
            class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All SSPs</option>
            <option
              v-for="ssp in availableSsps"
              :key="ssp.uuid"
              :value="ssp.uuid"
            >
              {{ ssp.title }}
            </option>
          </select>
        </div>
      </div>

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
            <option value="not-closed">Not Closed</option>
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
            <option value="moderate">Medium</option>
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
            <option value="moderate">Medium</option>
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

    <div class="flex justify-between items-center flex-wrap gap-2">
      <div class="flex gap-2 flex-wrap">
        <PrimaryButton @click="openCreate">Create Risk</PrimaryButton>
        <template v-if="enableBulkOps && selectedRiskIds.size > 0">
          <TertiaryButton @click="showBulkStatusModal = true">
            Bulk Status ({{ selectedRiskIds.size }})
          </TertiaryButton>
          <TertiaryButton @click="showBulkOwnerModal = true">
            Bulk Owner ({{ selectedRiskIds.size }})
          </TertiaryButton>
          <TertiaryButton @click="exportCsv">
            Export CSV ({{ selectedRiskIds.size }})
          </TertiaryButton>
        </template>
      </div>
      <p class="text-sm text-gray-500 dark:text-slate-400">
        Showing {{ paginatedRisks.length }} of {{ sortedRisks.length }} risks
      </p>
    </div>

    <div
      v-if="enableBulkOps && sortedRisks.length > 0"
      class="flex items-center gap-2"
    >
      <input
        id="select-all-risks"
        type="checkbox"
        :checked="allVisibleSelected"
        :indeterminate.prop="someVisibleSelected && !allVisibleSelected"
        class="w-4 h-4"
        @change="toggleSelectAll"
      />
      <label
        for="select-all-risks"
        class="text-sm text-gray-600 dark:text-slate-400"
      >
        Select all visible ({{ paginatedRisks.length }})
      </label>
    </div>

    <div v-if="!paginatedRisks.length" class="text-center py-8">
      <p class="text-gray-500 dark:text-slate-400">No risks found.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="risk in paginatedRisks"
        :key="riskRenderKey(risk)"
        class="bg-white dark:bg-slate-900 border border-ccf-300 dark:border-slate-700 rounded-lg p-6"
        :class="{
          'ring-2 ring-blue-500':
            enableBulkOps &&
            riskIdentifier(risk) &&
            selectedRiskIds.has(riskIdentifier(risk)),
        }"
      >
        <div class="flex flex-col lg:flex-row gap-4 lg:justify-between">
          <div v-if="enableBulkOps" class="flex items-start">
            <input
              type="checkbox"
              :checked="selectedRiskIds.has(riskIdentifier(risk))"
              :disabled="!riskIdentifier(risk)"
              :aria-label="`Select risk: ${risk.title || riskIdentifier(risk)}`"
              class="w-4 h-4"
              @change="toggleRiskSelection(risk)"
            />
          </div>

          <div class="flex-1 space-y-3">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3
                  class="text-lg font-medium text-gray-900 dark:text-slate-300"
                >
                  {{ risk.title || 'Untitled Risk' }}
                </h3>
                <span
                  v-if="getSspTitle(risk)"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                >
                  {{ getSspTitle(risk) }}
                </span>
                <span
                  v-if="isReviewOverdue(risk)"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                >
                  Overdue Review
                </span>
              </div>
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
              v-if="riskIdentifier(risk)"
              variant="text"
              :to="riskDetailRoute(risk)"
            >
              Open
            </RouterLinkButton>
            <TertiaryButton @click="editRisk(risk)">Edit</TertiaryButton>
            <TertiaryButton
              v-if="riskIdentifier(risk)"
              @click="
                confirmDeleteDialog(() => deleteRisk(risk), {
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

    <div
      v-if="pageSize > 0 && totalPages > 1"
      class="flex justify-center items-center gap-2"
    >
      <TertiaryButton
        :disabled="currentPage === 1"
        @click="currentPage = Math.max(1, currentPage - 1)"
      >
        Previous
      </TertiaryButton>
      <span class="text-sm text-gray-600 dark:text-slate-400">
        Page {{ currentPage }} of {{ totalPages }}
      </span>
      <TertiaryButton
        :disabled="currentPage === totalPages"
        @click="currentPage = Math.min(totalPages, currentPage + 1)"
      >
        Next
      </TertiaryButton>
    </div>

    <Dialog v-model:visible="showSspPickerModal" modal size="sm">
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
          Select System Security Plan
        </h3>
        <p class="text-sm text-gray-600 dark:text-slate-400">
          Choose the SSP this risk belongs to.
        </p>
        <label for="ssp-select" class="sr-only">System Security Plan</label>
        <select
          id="ssp-select"
          v-model="createSspId"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">Select an SSP...</option>
          <option
            v-for="ssp in availableSsps"
            :key="ssp.uuid"
            :value="ssp.uuid"
          >
            {{ ssp.title }}
          </option>
        </select>
        <div class="flex justify-end gap-2">
          <TertiaryButton @click="showSspPickerModal = false">
            Cancel
          </TertiaryButton>
          <PrimaryButton :disabled="!createSspId" @click="confirmSspPicker">
            Continue
          </PrimaryButton>
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="showCreateModal" modal size="lg">
      <RiskCreateForm
        :ssp-id="effectiveCreateSspId"
        @cancel="showCreateModal = false"
        @created="handleRiskCreated"
      />
    </Dialog>

    <Dialog v-model:visible="showEditModal" modal size="lg">
      <RiskEditForm
        v-if="editingRisk"
        :ssp-id="getEditSspId()"
        :risk="editingRisk"
        @cancel="showEditModal = false"
        @saved="handleRiskSaved"
      />
    </Dialog>

    <Dialog v-model:visible="showBulkStatusModal" modal size="sm">
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
          Bulk Status Update
        </h3>
        <p class="text-sm text-gray-600 dark:text-slate-400">
          Update status for {{ selectedRiskIds.size }} selected risk(s).
        </p>
        <label for="bulk-status-select" class="sr-only">Status</label>
        <select
          id="bulk-status-select"
          v-model="bulkStatusValue"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">Select a status...</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="mitigating-planned">Mitigating Planned</option>
          <option value="mitigating-implemented">Mitigating Implemented</option>
          <option value="closed">Closed</option>
        </select>
        <div class="flex justify-end gap-2">
          <TertiaryButton @click="showBulkStatusModal = false">
            Cancel
          </TertiaryButton>
          <PrimaryButton
            :disabled="!bulkStatusValue || bulkOperating"
            @click="applyBulkStatus"
          >
            {{ bulkOperating ? 'Updating...' : 'Apply' }}
          </PrimaryButton>
        </div>
      </div>
    </Dialog>

    <Dialog v-model:visible="showBulkOwnerModal" modal size="sm">
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
          Bulk Owner Assignment
        </h3>
        <p class="text-sm text-gray-600 dark:text-slate-400">
          Assign owner for {{ selectedRiskIds.size }} selected risk(s).
        </p>
        <label for="bulk-owner-input" class="sr-only">Owner</label>
        <input
          id="bulk-owner-input"
          v-model="bulkOwnerValue"
          type="text"
          placeholder="Owner name or email"
          class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-slate-200"
        />
        <div class="flex justify-end gap-2">
          <TertiaryButton @click="showBulkOwnerModal = false">
            Cancel
          </TertiaryButton>
          <PrimaryButton
            :disabled="!bulkOwnerValue.trim() || bulkOperating"
            @click="applyBulkOwner"
          >
            {{ bulkOperating ? 'Updating...' : 'Apply' }}
          </PrimaryButton>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, shallowRef, triggerRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { type Risk } from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import RiskCreateForm from '@/components/risk/RiskCreateForm.vue';
import RiskEditForm from '@/components/risk/RiskEditForm.vue';
import { useToast } from 'primevue/usetoast';
import PageHeader from '@/components/PageHeader.vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useDeleteConfirmationDialog } from '@/utils/delete-dialog';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
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
import { getRiskIdentifier } from '@/utils/risk-id';

export interface SspOption {
  uuid: string;
  title: string;
}

const props = withDefaults(
  defineProps<{
    risks: Risk[];
    loading?: boolean;
    error?: string | null;
    contextMissing?: boolean;
    sspId?: string | null;
    sspMap?: Record<string, string>;
    riskSspIds?: Record<string, string>;
    availableSsps?: SspOption[];
    enableBulkOps?: boolean;
    pageSize?: number;
    title?: string;
  }>(),
  {
    loading: false,
    error: null,
    contextMissing: false,
    sspId: null,
    sspMap: undefined,
    riskSspIds: undefined,
    availableSsps: undefined,
    enableBulkOps: false,
    pageSize: 0,
    title: 'Risk Register',
  },
);

const emit = defineEmits<{
  'risk-created': [risk: Risk];
  'risk-updated': [risk: Risk];
  'risk-deleted': [riskId: string, sspId: string];
  'refresh-requested': [];
}>();

const route = useRoute();
const toast = useToast();
const { confirmDeleteDialog } = useDeleteConfirmationDialog();

interface PanelRiskFilters extends RiskFilters {
  sspId: string;
}

const defaultPanelFilters: PanelRiskFilters = {
  ...defaultRiskFilters,
  sspId: 'all',
};

const filters = reactive<PanelRiskFilters>({ ...defaultPanelFilters });
const sortBy = ref<RiskSortBy>('updated');
const sortDirection = ref<SortDirection>('desc');
const currentPage = ref(1);

const showCreateModal = ref(false);
const showEditModal = ref(false);
const showSspPickerModal = ref(false);
const showBulkStatusModal = ref(false);
const showBulkOwnerModal = ref(false);
const editingRisk = ref<Risk | null>(null);
const createSspId = ref('');
const bulkStatusValue = ref('');
const bulkOwnerValue = ref('');
const bulkOperating = ref(false);
const selectedRiskIds = shallowRef<Set<string>>(new Set());

const riskFallbackKeys = new WeakMap<Risk, string>();
let riskFallbackCounter = 0;

watch(
  () => route.query.controlId,
  (value) => {
    const next =
      typeof value === 'string'
        ? value
        : Array.isArray(value) && typeof value[0] === 'string'
          ? value[0]
          : '';
    if (filters.controlId !== next) {
      filters.controlId = next;
    }
  },
  { immediate: true },
);

watch(
  () => props.risks,
  () => {
    currentPage.value = 1;
    selectedRiskIds.value = new Set();
    triggerRef(selectedRiskIds);
  },
);

watch(
  () => [
    filters.search,
    filters.status,
    filters.likelihood,
    filters.impact,
    filters.owner,
    filters.review,
    filters.controlId,
    filters.evidenceId,
    filters.sspId,
    sortBy.value,
    sortDirection.value,
  ],
  () => {
    selectedRiskIds.value = new Set();
    triggerRef(selectedRiskIds);
  },
);

const { execute: executeDeleteRisk } = useDataApi<void>(
  null,
  { method: 'DELETE' },
  { immediate: false },
);

const { execute: executeUpdateRisk } = useDataApi<Risk>(
  null,
  { method: 'PUT', transformRequest: [decamelizeKeys] },
  { immediate: false, abortPrevious: false },
);

function getSspIdForRisk(risk: Risk): string | null {
  if (props.sspId) return props.sspId;
  const riskId = getRiskIdentifier(risk);
  return props.riskSspIds?.[riskId] ?? null;
}

function getSspTitle(risk: Risk): string {
  if (!props.sspMap) return '';
  const sspId = getSspIdForRisk(risk);
  if (!sspId) return '';
  return props.sspMap[sspId] ?? '';
}

const sspFilteredRisks = computed(() => {
  if (filters.sspId === 'all' || !props.riskSspIds) {
    return props.risks;
  }
  return props.risks.filter((risk) => {
    const riskId = getRiskIdentifier(risk);
    return props.riskSspIds![riskId] === filters.sspId;
  });
});

const riskSummary = computed(() =>
  computeRiskSummary(sspFilteredRisks.value || []),
);

const filteredRisks = computed(() =>
  filterRisks(sspFilteredRisks.value || [], filters),
);

const sortedRisks = computed(() =>
  sortRisks(filteredRisks.value, sortBy.value, sortDirection.value),
);

const totalPages = computed(() => {
  if (props.pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(sortedRisks.value.length / props.pageSize));
});

const paginatedRisks = computed(() => {
  if (props.pageSize <= 0) return sortedRisks.value;
  const start = (currentPage.value - 1) * props.pageSize;
  return sortedRisks.value.slice(start, start + props.pageSize);
});

const statusOptions = computed(() => {
  const statuses = new Set(
    (props.risks || []).map((risk) => (risk.status || '').toLowerCase()),
  );
  return Array.from(statuses)
    .filter((status) => !!status)
    .sort((left, right) => left.localeCompare(right));
});

const allVisibleSelected = computed(() => {
  if (!paginatedRisks.value.length) return false;
  return paginatedRisks.value.every((risk) => {
    const id = getRiskIdentifier(risk);
    return id && selectedRiskIds.value.has(id);
  });
});

const someVisibleSelected = computed(() => {
  return paginatedRisks.value.some((risk) => {
    const id = getRiskIdentifier(risk);
    return id && selectedRiskIds.value.has(id);
  });
});

const effectiveCreateSspId = computed(() => {
  if (props.sspId) return props.sspId;
  return createSspId.value || undefined;
});

watch(
  () => totalPages.value,
  (newTotalPages) => {
    if (currentPage.value > newTotalPages) {
      currentPage.value = Math.max(1, newTotalPages);
    }
  },
);

function toggleSelectAll() {
  if (allVisibleSelected.value) {
    paginatedRisks.value.forEach((risk) => {
      const id = getRiskIdentifier(risk);
      if (id) selectedRiskIds.value.delete(id);
    });
  } else {
    paginatedRisks.value.forEach((risk) => {
      const id = getRiskIdentifier(risk);
      if (id) selectedRiskIds.value.add(id);
    });
  }
  triggerRef(selectedRiskIds);
}

function toggleRiskSelection(risk: Risk) {
  const id = getRiskIdentifier(risk);
  if (!id) return;
  if (selectedRiskIds.value.has(id)) {
    selectedRiskIds.value.delete(id);
  } else {
    selectedRiskIds.value.add(id);
  }
  triggerRef(selectedRiskIds);
}

function openCreate() {
  if (!props.sspId && props.availableSsps && props.availableSsps.length > 0) {
    createSspId.value = '';
    showSspPickerModal.value = true;
  } else {
    showCreateModal.value = true;
  }
}

function confirmSspPicker() {
  if (!createSspId.value) return;
  showSspPickerModal.value = false;
  showCreateModal.value = true;
}

function editRisk(risk: Risk) {
  const riskId = getRiskIdentifier(risk);
  if (!riskId) {
    toast.add({
      severity: 'error',
      summary: 'Missing risk identifier',
      detail: 'This risk cannot be edited because it has no identifier.',
      life: 4000,
    });
    return;
  }
  const sspId = getSspIdForRisk(risk);
  if (!sspId) {
    toast.add({
      severity: 'error',
      summary: 'Cannot Edit Risk',
      detail: 'Cannot determine the SSP for this risk.',
      life: 4000,
    });
    return;
  }
  editingRisk.value = risk;
  showEditModal.value = true;
}

function getEditSspId(): string | undefined {
  if (editingRisk.value) {
    const id = getSspIdForRisk(editingRisk.value);
    if (id) return id;
  }
  return props.sspId ?? undefined;
}

function handleRiskCreated(newRisk: Risk) {
  showCreateModal.value = false;
  createSspId.value = '';
  emit('risk-created', newRisk);
}

function handleRiskSaved(updatedRisk: Risk) {
  showEditModal.value = false;
  editingRisk.value = null;
  emit('risk-updated', updatedRisk);
}

async function deleteRisk(risk: Risk) {
  const riskId = riskIdentifier(risk);
  const sspIdForRisk = getSspIdForRisk(risk);

  if (!sspIdForRisk) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: 'Cannot determine the SSP for this risk.',
      life: 5000,
    });
    return;
  }

  if (!riskId) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: 'Risk identifier is missing.',
      life: 5000,
    });
    return;
  }

  try {
    await executeDeleteRisk(
      `/api/oscal/system-security-plans/${sspIdForRisk}/risks/${riskId}`,
    );
    toast.add({
      severity: 'success',
      summary: 'Risk Deleted',
      detail: 'Risk deleted successfully',
      life: 3000,
    });
    emit('risk-deleted', riskId, sspIdForRisk);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: `Failed to delete risk: ${errorMessage}`,
      life: 5000,
    });
  }
}

const BULK_CONCURRENCY_LIMIT = 5;

async function executeBulkUpdate(
  risks: Risk[],
  updateFn: (risk: Risk) => Promise<void>,
  successSummary: string,
) {
  let successCount = 0;
  const failedRisks: string[] = [];

  for (let i = 0; i < risks.length; i += BULK_CONCURRENCY_LIMIT) {
    const batch = risks.slice(i, i + BULK_CONCURRENCY_LIMIT);
    const results = await Promise.allSettled(
      batch.map(async (risk) => {
        await updateFn(risk);
        return getRiskIdentifier(risk);
      }),
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        const riskId = getRiskIdentifier(batch[idx]);
        if (riskId) failedRisks.push(riskId);
      }
    });
  }

  const severity =
    successCount === 0
      ? 'error'
      : successCount < risks.length
        ? 'warn'
        : 'success';
  const summary =
    successCount === 0
      ? 'Bulk Update Failed'
      : successCount < risks.length
        ? 'Partial Update'
        : successSummary;
  toast.add({
    severity,
    summary,
    detail: `Updated ${successCount} of ${risks.length} risk(s).${failedRisks.length > 0 ? ` Failed: ${failedRisks.length}` : ''}`,
    life: 4000,
  });
}

async function applyBulkStatus() {
  if (!bulkStatusValue.value) return;
  bulkOperating.value = true;
  const selected = props.risks.filter((risk) => {
    const id = getRiskIdentifier(risk);
    return id && selectedRiskIds.value.has(id);
  });

  await executeBulkUpdate(
    selected,
    async (risk) => {
      const riskId = getRiskIdentifier(risk);
      const sspId = getSspIdForRisk(risk);
      if (!riskId || !sspId) throw new Error('Missing risk or SSP ID');
      await executeUpdateRisk(
        `/api/oscal/system-security-plans/${sspId}/risks/${riskId}`,
        { data: { ...risk, status: bulkStatusValue.value } },
      );
    },
    'Bulk Status Updated',
  );

  showBulkStatusModal.value = false;
  bulkStatusValue.value = '';
  bulkOperating.value = false;
  selectedRiskIds.value = new Set();
  triggerRef(selectedRiskIds);
  emit('refresh-requested');
}

async function applyBulkOwner() {
  if (!bulkOwnerValue.value.trim()) return;
  bulkOperating.value = true;
  const selected = props.risks.filter((risk) => {
    const id = getRiskIdentifier(risk);
    return id && selectedRiskIds.value.has(id);
  });

  await executeBulkUpdate(
    selected,
    async (risk) => {
      const riskId = getRiskIdentifier(risk);
      const sspId = getSspIdForRisk(risk);
      if (!riskId || !sspId) throw new Error('Missing risk or SSP ID');
      const updatedRisk = { ...risk } as Risk & Record<string, unknown>;
      updatedRisk['owner'] = bulkOwnerValue.value.trim();
      await executeUpdateRisk(
        `/api/oscal/system-security-plans/${sspId}/risks/${riskId}`,
        { data: updatedRisk },
      );
    },
    'Bulk Owner Updated',
  );

  showBulkOwnerModal.value = false;
  bulkOwnerValue.value = '';
  bulkOperating.value = false;
  selectedRiskIds.value = new Set();
  triggerRef(selectedRiskIds);
  emit('refresh-requested');
}

function sanitizeCsvCell(value: string): string {
  // Prevent CSV injection by prefixing formula-triggering characters
  // Also handle leading whitespace before these characters
  if (value.match(/^\s*[=+\-@]/)) {
    return "'" + value;
  }
  return value;
}

function exportCsv() {
  const selected = props.risks.filter((risk) => {
    const id = getRiskIdentifier(risk);
    return id && selectedRiskIds.value.has(id);
  });

  const headers = [
    'UUID',
    'SSP',
    'Title',
    'Description',
    'Status',
    'Likelihood',
    'Impact',
    'Owner',
    'Review Deadline',
    'Evidence Count',
    'Control Count',
    'Component Count',
  ];

  const rows = selected.map((risk) => [
    getRiskIdentifier(risk),
    getSspTitle(risk),
    risk.title || '',
    risk.description || '',
    risk.status || '',
    riskLikelihood(risk),
    riskImpact(risk),
    riskOwner(risk),
    formatDateTime(riskReviewDeadline(risk)),
    String(riskEvidenceCount(risk)),
    String(riskControlCount(risk)),
    String(riskComponentCount(risk)),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${sanitizeCsvCell(cell).replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `risks-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function riskDetailRoute(risk: Risk) {
  const sspId = getSspIdForRisk(risk);
  const riskId = riskIdentifier(risk);

  if (!sspId) {
    return { name: 'system-security-plans' };
  }

  return {
    name: 'system-security-plan-risk-detail',
    params: { id: sspId, riskId },
  };
}

function riskIdentifier(risk: Risk): string {
  return getRiskIdentifier(risk);
}

function riskRenderKey(risk: Risk): string {
  const identifier = riskIdentifier(risk);
  if (identifier) return identifier;

  const existingKey = riskFallbackKeys.get(risk);
  if (existingKey) return existingKey;

  const generatedKey = `risk-fallback-${++riskFallbackCounter}`;
  riskFallbackKeys.set(risk, generatedKey);
  return generatedKey;
}

function resetFilters() {
  Object.assign(filters, defaultPanelFilters);
  sortBy.value = 'updated';
  sortDirection.value = 'desc';
  currentPage.value = 1;
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
