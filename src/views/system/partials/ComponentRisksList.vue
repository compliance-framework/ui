<template>
  <div class="mt-6 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h4 class="text-sm font-semibold text-gray-700 dark:text-slate-200">
        Risks
      </h4>
      <PrimaryButton
        data-testid="create-risk"
        :disabled="!props.sspId || !props.component.uuid"
        @click="showCreateRiskDrawer = true"
      >
        Create Risk
      </PrimaryButton>
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <div>
        <label
          for="component-risk-status-filter"
          class="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300"
        >
          Status
        </label>
        <select
          id="component-risk-status-filter"
          v-model="statusFilter"
          data-testid="status-filter"
          class="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="all">All</option>
          <option v-for="status in statusOptions" :key="status" :value="status">
            {{ riskStatusLabel(status) }}
          </option>
        </select>
      </div>

      <div>
        <label
          for="component-risk-sort-by"
          class="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300"
        >
          Sort By
        </label>
        <select
          id="component-risk-sort-by"
          v-model="sortBy"
          data-testid="sort-by"
          class="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="severity">Severity</option>
          <option value="status">Status</option>
          <option value="deadline">Deadline</option>
        </select>
      </div>

      <div>
        <label
          for="component-risk-sort-direction"
          class="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-300"
        >
          Direction
        </label>
        <select
          id="component-risk-sort-direction"
          v-model="sortDirection"
          data-testid="sort-direction"
          class="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
    </div>

    <p class="text-xs text-gray-500 dark:text-slate-400">
      Showing {{ visibleRisks.length }} of {{ componentRisks.length }} risks for
      this component
    </p>

    <p
      v-if="props.loadingRisks"
      class="text-sm text-gray-500 dark:text-slate-400"
    >
      Loading risks...
    </p>

    <p
      v-else-if="!visibleRisks.length"
      class="text-sm text-gray-500 dark:text-slate-400"
    >
      No risks associated with this component.
    </p>

    <div v-else class="space-y-2">
      <button
        v-for="risk in visibleRisks"
        :key="riskRenderKey(risk)"
        data-testid="risk-row"
        class="w-full rounded-md border border-gray-300 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700 dark:hover:bg-slate-800"
        type="button"
        @click="openRiskDetail(risk)"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="space-y-1">
            <p class="font-medium text-gray-900 dark:text-slate-100">
              {{ risk.title || 'Untitled Risk' }}
            </p>
            <p class="text-xs text-gray-500 dark:text-slate-400">
              {{ riskIdentifier(risk) || 'Missing identifier' }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span
              class="inline-flex items-center rounded-full px-2.5 py-0.5 font-medium"
              :class="statusBadgeClass(risk.status)"
            >
              {{ riskStatusLabel(risk.status) }}
            </span>
            <span
              class="inline-flex items-center rounded-full px-2.5 py-0.5 font-medium"
              :class="severityBadgeClass(risk)"
            >
              {{ severityLabel(risk) }}
            </span>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <div>
            <p class="text-xs text-gray-500 dark:text-slate-400">Severity</p>
            <p class="font-medium text-gray-700 dark:text-slate-200">
              {{ severityScore(risk) }}
              <span class="font-normal text-gray-500 dark:text-slate-400">
                ({{ formatLabel(riskLikelihood(risk) || 'unknown') }} ×
                {{ formatLabel(riskImpact(risk) || 'unknown') }})
              </span>
            </p>
          </div>

          <div>
            <p class="text-xs text-gray-500 dark:text-slate-400">
              Review Deadline
            </p>
            <p class="font-medium text-gray-700 dark:text-slate-200">
              {{ formatDateTime(riskReviewDeadline(risk)) }}
            </p>
          </div>

          <div>
            <p class="text-xs text-gray-500 dark:text-slate-400">Owner</p>
            <p class="font-medium text-gray-700 dark:text-slate-200">
              {{ riskOwner(risk) || 'Unassigned' }}
            </p>
          </div>
        </div>
      </button>
    </div>
  </div>

  <Drawer
    v-model:visible="showCreateRiskDrawer"
    header="Create Risk"
    position="right"
    class="w-full! md:w-1/2! lg:w-3/5!"
  >
    <RiskCreateForm
      :ssp-id="props.sspId"
      @cancel="showCreateRiskDrawer = false"
      @created="handleRiskCreated"
    />
  </Drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { Risk, SystemComponent, SystemUser } from '@/oscal';
import { decamelizeKeys, useDataApi } from '@/composables/axios';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import Drawer from '@/volt/Drawer.vue';
import RiskCreateForm from '@/components/risk/RiskCreateForm.vue';
import {
  getRiskComponentIds,
  getRiskImpact,
  getRiskLikelihood,
  getRiskOwnerDisplay,
  getRiskReviewDeadline,
  getRiskSeverityLevel,
  getRiskSeverityScore,
  isClosedStatus,
  type RiskSeverityLevel,
  type SortDirection,
} from '@/utils/risk-register';
import {
  normalizeOwnerAssignments,
  normalizeRiskRegisterStatus,
  riskStatusLabel,
} from '@/utils/risk-workflow';
import { getRiskIdentifier } from '@/utils/risk-id';

const props = defineProps<{
  sspId: string;
  component: SystemComponent;
  risks: Risk[];
  users: SystemUser[];
  loadingRisks?: boolean;
}>();

const emit = defineEmits<{
  'risks-updated': [];
}>();

type ComponentRiskSortBy = 'severity' | 'status' | 'deadline';

const router = useRouter();
const toast = useToast();

const showCreateRiskDrawer = ref(false);
const statusFilter = ref('all');
const sortBy = ref<ComponentRiskSortBy>('severity');
const sortDirection = ref<SortDirection>('desc');

const { execute: linkRiskComponent } = useDataApi<void>(
  null,
  { method: 'POST', transformRequest: [decamelizeKeys] },
  { immediate: false },
);

function normalizeId(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function readString(
  source: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const candidate = source[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

const componentRisks = computed(() => {
  if (!props.risks?.length || !props.component.uuid) {
    return [];
  }

  const normalizedComponentId = normalizeId(props.component.uuid);

  return props.risks.filter((risk) =>
    getRiskComponentIds(risk)
      .map((id) => normalizeId(id))
      .includes(normalizedComponentId),
  );
});

const usersById = computed(() => {
  return new Map(
    (props.users || []).map((user) => [
      user.uuid,
      user.title || user.shortName,
    ]),
  );
});

const statusOptions = computed(() => {
  const statuses = new Set<string>();

  componentRisks.value.forEach((risk) => {
    const normalized = normalizeRiskRegisterStatus(risk.status);
    if (normalized) {
      statuses.add(normalized);
    }
  });

  return Array.from(statuses)
    .filter((status) => !!status)
    .sort((left, right) => left.localeCompare(right));
});

const filteredRisks = computed(() => {
  if (statusFilter.value === 'all') {
    return componentRisks.value;
  }

  return componentRisks.value.filter(
    (risk) => normalizeRiskRegisterStatus(risk.status) === statusFilter.value,
  );
});

function compareWithDirection(
  left: number,
  right: number,
  direction: SortDirection,
): number {
  return direction === 'asc' ? left - right : right - left;
}

function compareStringWithDirection(
  left: string,
  right: string,
  direction: SortDirection,
): number {
  const compared = left.localeCompare(right, undefined, {
    sensitivity: 'base',
  });
  return direction === 'asc' ? compared : -compared;
}

function deadlineTimestamp(value?: string): number {
  if (!value) return 0;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 0;
  return parsed.getTime();
}

const visibleRisks = computed(() => {
  return [...filteredRisks.value].sort((left, right) => {
    switch (sortBy.value) {
      case 'status':
        return compareStringWithDirection(
          normalizeRiskRegisterStatus(left.status) || '',
          normalizeRiskRegisterStatus(right.status) || '',
          sortDirection.value,
        );
      case 'deadline':
        return compareWithDirection(
          deadlineTimestamp(getRiskReviewDeadline(left)),
          deadlineTimestamp(getRiskReviewDeadline(right)),
          sortDirection.value,
        );
      case 'severity':
      default:
        return compareWithDirection(
          severityScore(left),
          severityScore(right),
          sortDirection.value,
        );
    }
  });
});

const riskFallbackKeys = new WeakMap<Risk, string>();
let riskFallbackCounter = 0;

function riskIdentifier(risk: Risk): string {
  return getRiskIdentifier(risk);
}

function riskRenderKey(risk: Risk): string {
  const identifier = riskIdentifier(risk);
  if (identifier) return identifier;

  const existing = riskFallbackKeys.get(risk);
  if (existing) return existing;

  const generated = `component-risk-fallback-${++riskFallbackCounter}`;
  riskFallbackKeys.set(risk, generated);
  return generated;
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

function formatDateTime(value?: string): string {
  if (!value) return 'N/A';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function statusBadgeClass(status?: string): string {
  const normalized = normalizeRiskRegisterStatus(status);

  if (isClosedStatus(status)) {
    return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
  }

  if (normalized === 'risk-accepted') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
  }

  if (normalized === 'open' || normalized === 'investigating') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
  }

  return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
}

function severityLevel(risk: Risk): RiskSeverityLevel {
  return getRiskSeverityLevel(risk);
}

function severityScore(risk: Risk): number {
  return getRiskSeverityScore(risk);
}

function severityLabel(risk: Risk): string {
  return formatLabel(severityLevel(risk));
}

function severityBadgeClass(risk: Risk): string {
  switch (severityLevel(risk)) {
    case 'critical':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'medium':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'low':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    default:
      return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
  }
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function riskOwner(risk: Risk): string {
  const source = toRecord(risk);
  const normalizedOwners = normalizeOwnerAssignments({
    primaryOwnerUserId: source
      ? readString(source, ['primaryOwnerUserId'])
      : undefined,
    ownerAssignments: Array.isArray(source?.ownerAssignments)
      ? source.ownerAssignments
          .map((entry) => toRecord(entry))
          .filter(
            (entry): entry is Record<string, unknown> =>
              !!entry && readString(entry, ['ownerKind']) === 'user',
          )
          .map((entry) => ({
            ownerKind: 'user' as const,
            ownerRef: readString(entry, ['ownerRef']) || '',
            isPrimary: !!entry.isPrimary,
          }))
          .filter((entry) => !!entry.ownerRef)
      : [],
  });

  const orderedOwnerRefs = [
    normalizedOwners.primaryOwnerUserId,
    ...normalizedOwners.ownerAssignments.map((entry) => entry.ownerRef),
  ].filter((value, index, sourceValues): value is string => {
    return !!value && sourceValues.indexOf(value) === index;
  });

  for (const ownerRef of orderedOwnerRefs) {
    const label = usersById.value.get(ownerRef);
    if (label) return label;
  }

  const fallback = getRiskOwnerDisplay(risk);
  if (fallback && !looksLikeUuid(fallback)) {
    return fallback;
  }

  return orderedOwnerRefs.length ? 'Assigned' : '';
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

function openRiskDetail(risk: Risk) {
  const riskId = riskIdentifier(risk);
  if (!riskId || !props.sspId) {
    return;
  }

  void router.push({
    name: 'system-security-plan-risk-detail',
    params: {
      id: props.sspId,
      riskId,
    },
  });
}

function refreshRisks() {
  emit('risks-updated');
}

async function handleRiskCreated(risk: Risk) {
  const riskId = riskIdentifier(risk);

  if (!riskId || !props.sspId || !props.component.uuid) {
    toast.add({
      severity: 'warn',
      summary: 'Risk created',
      detail:
        'Risk was created, but component association could not be resolved.',
      life: 4000,
    });
    showCreateRiskDrawer.value = false;
    return;
  }

  const linkEndpoint = `/api/oscal/system-security-plans/${props.sspId}/risks/${riskId}/components`;

  try {
    await linkRiskComponent(linkEndpoint, {
      data: {
        componentId: props.component.uuid,
      },
    });

    toast.add({
      severity: 'success',
      summary: 'Risk linked',
      detail: 'Risk created and linked to this component.',
      life: 3000,
    });

    showCreateRiskDrawer.value = false;
    refreshRisks();
  } catch (err) {
    const detail =
      err instanceof Error && err.message
        ? err.message
        : 'Risk was created but could not be linked to this component.';

    toast.add({
      severity: 'warn',
      summary: 'Risk created',
      detail,
      life: 5000,
    });

    showCreateRiskDrawer.value = false;
    refreshRisks();
  }
}
</script>
