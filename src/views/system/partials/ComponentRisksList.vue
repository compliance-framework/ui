<template>
  <PanelSection title="Risks" :level="4">
    <template #actions>
      <Button
        icon="add"
        data-testid="create-risk"
        :disabled-reason="
          props.sspId && props.component.uuid
            ? undefined
            : 'This component has no ID yet, so risks can\'t be linked to it.'
        "
        @click="showCreateRiskDrawer = true"
        >New risk</Button
      >
    </template>
    <Stack gap="4">
      <Grid min="sm" gap="3">
        <FormField label="Status">
          <Select
            v-model="statusFilter"
            :options="statusFilterOptions"
            data-testid="status-filter"
          />
        </FormField>
        <FormField label="Sort by">
          <Select
            v-model="sortBy"
            :options="sortByOptions"
            data-testid="sort-by"
          />
        </FormField>
        <FormField label="Direction">
          <Select
            v-model="sortDirection"
            :options="sortDirectionOptions"
            data-testid="sort-direction"
          />
        </FormField>
      </Grid>
      <DataState
        :status="listStatus"
        subject="risks"
        :empty-title="
          statusFilter === 'all'
            ? 'No risks for this component'
            : 'No risks with this status'
        "
        empty-body="Risks linked to this component appear here."
        icon="risks"
      >
        <DataTable
          :caption="`Showing ${visibleRisks.length} of ${plural(componentRisks.length, 'risk')} for this component`"
          :columns="columns"
          :rows="visibleRisks"
          :row-key="riskRenderKey"
        >
          <template #cell-title="{ row: risk }">
            <Stack gap="1" data-testid="risk-row">
              <TextLink
                v-if="riskDetailLink(risk)"
                :to="riskDetailLink(risk)!"
                >{{ risk.title || 'Untitled risk' }}</TextLink
              >
              <Text v-else as="span">{{ risk.title || 'Untitled risk' }}</Text>
              <Text as="span" variant="caption">{{
                riskIdentifier(risk) || 'No identifier'
              }}</Text>
            </Stack>
          </template>
          <template #cell-status="{ row: risk }">
            <StatusBadge
              v-if="riskBadge(normalizedStatusForList(risk.status))"
              :status="riskBadge(normalizedStatusForList(risk.status))!"
            />
            <template v-else>{{ riskStatusLabel(risk.status) }}</template>
          </template>
          <template #cell-severity="{ row: risk }">
            <Stack gap="1">
              <StatusBadge
                v-if="riskBadge(severityLevel(risk))"
                :status="riskBadge(severityLevel(risk))!"
              />
              <template v-else>{{ severityLabel(risk) }}</template>
              <Text as="span" variant="caption"
                >{{ severityScore(risk) }} ({{
                  formatLabel(riskLikelihood(risk) || 'unknown')
                }}
                × {{ formatLabel(riskImpact(risk) || 'unknown') }})</Text
              >
            </Stack>
          </template>
          <template #cell-deadline="{ row: risk }">{{
            formatDateTime(riskReviewDeadline(risk))
          }}</template>
          <template #cell-owner="{ row: risk }">{{
            riskOwner(risk) || 'Unassigned'
          }}</template>
        </DataTable>
      </DataState>
    </Stack>
  </PanelSection>

  <Drawer v-model:open="showCreateRiskDrawer" title="New risk">
    <RiskCreateForm
      v-if="showCreateRiskDrawer"
      :ssp-id="props.sspId"
      @cancel="showCreateRiskDrawer = false"
      @created="handleRiskCreated"
    />
  </Drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import type { Risk, SystemComponent, SystemUser } from '@/oscal';
import { decamelizeKeys, useDataApi } from '@/composables/axios';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Select from '@/ds/components/Select/Select.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { plural } from '@/ds/format';
import { riskBadge } from '@/screens/risks/risks';
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
  normalizeRiskStatus,
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
type SelectOption<T extends string> = {
  label: string;
  value: T;
};

const toast = useToast();

const showCreateRiskDrawer = ref(false);
const statusFilter = ref('all');
const sortBy = ref<ComponentRiskSortBy>('severity');
const sortDirection = ref<SortDirection>('desc');

const sortByOptions: SelectOption<ComponentRiskSortBy>[] = [
  { label: 'Severity', value: 'severity' },
  { label: 'Status', value: 'status' },
  { label: 'Deadline', value: 'deadline' },
];

const sortDirectionOptions: SelectOption<SortDirection>[] = [
  { label: 'Descending', value: 'desc' },
  { label: 'Ascending', value: 'asc' },
];

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

function normalizedStatusForList(status?: string): string {
  const workflowStatus = normalizeRiskRegisterStatus(status);
  if (workflowStatus) {
    return workflowStatus;
  }
  if (isClosedStatus(status)) {
    return 'closed';
  }
  return normalizeRiskStatus(status) || 'unknown';
}

const statusOptions = computed(() => {
  const statuses = new Set<string>();

  componentRisks.value.forEach((risk) => {
    const normalized = normalizedStatusForList(risk.status);
    if (normalized) {
      statuses.add(normalized);
    }
  });

  return Array.from(statuses)
    .filter((status) => !!status)
    .sort((left, right) => left.localeCompare(right));
});

const statusFilterOptions = computed(() => [
  { label: 'All', value: 'all' },
  ...statusOptions.value.map((status) => ({
    label: riskStatusLabel(status),
    value: status,
  })),
]);

const filteredRisks = computed(() => {
  if (statusFilter.value === 'all') {
    return componentRisks.value;
  }

  return componentRisks.value.filter(
    (risk) => normalizedStatusForList(risk.status) === statusFilter.value,
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
          normalizedStatusForList(left.status),
          normalizedStatusForList(right.status),
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
  if (!value) return 'Not set';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
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

function riskDetailLink(risk: Risk) {
  const riskId = riskIdentifier(risk);
  if (!riskId || !props.sspId) return undefined;
  return {
    name: 'system-security-plan-risk-detail',
    params: { id: props.sspId, riskId },
  };
}

const columns: DataTableColumn[] = [
  { key: 'title', label: 'Risk', minWidth: 'sm' },
  { key: 'status', label: 'Status' },
  { key: 'severity', label: 'Severity' },
  { key: 'deadline', label: 'Review deadline' },
  { key: 'owner', label: 'Owner' },
];

const listStatus = computed(() => {
  if (props.loadingRisks) return 'loading';
  return visibleRisks.value.length ? 'ready' : 'empty';
});

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
    refreshRisks();
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
