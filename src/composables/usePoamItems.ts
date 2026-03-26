/**
 * Composable for the CCF POAM Items REST API (/api/poam-items)
 * Follows the same useDataApi pattern as RisksView.vue and other views.
 */
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type {
  PoamItem,
  PoamItemMilestone,
  CreatePoamItemRequest,
  UpdatePoamItemRequest,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  PoamItemListFilters,
  PromoteRiskToPoamRequest,
} from '@/types/poam-items';

// ─── POAM Items ───────────────────────────────────────────────────────────────

export function usePoamItemsList(filters?: PoamItemListFilters) {
  const params = new URLSearchParams();
  if (filters?.sspId) params.set('sspId', filters.sspId);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.overdueOnly) params.set('overdueOnly', 'true');
  if (filters?.deadlineBefore)
    params.set('deadlineBefore', filters.deadlineBefore);
  if (filters?.riskId) params.set('riskId', filters.riskId);
  if (filters?.ownerRef) params.set('ownerRef', filters.ownerRef);

  const query = params.toString() ? `?${params.toString()}` : '';
  const endpoint = `/api/poam-items${query}`;

  return useDataApi<PoamItem[]>(endpoint);
}

export function usePoamItemsListBySSP(
  sspId: string,
  filters?: Omit<PoamItemListFilters, 'sspId'>,
) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.overdueOnly) params.set('overdueOnly', 'true');
  if (filters?.deadlineBefore)
    params.set('deadlineBefore', filters.deadlineBefore);
  if (filters?.riskId) params.set('riskId', filters.riskId);
  if (filters?.ownerRef) params.set('ownerRef', filters.ownerRef);

  const query = params.toString() ? `?${params.toString()}` : '';
  const endpoint = `/api/system-security-plans/${sspId}/poam-items${query}`;

  return useDataApi<PoamItem[]>(endpoint);
}

export function usePoamItemCreate() {
  const { execute, isLoading, error } = useDataApi<PoamItem>(
    null,
    {},
    { immediate: false },
  );

  async function createPoamItem(payload: CreatePoamItemRequest) {
    return execute(`/api/poam-items`, {
      method: 'POST',
      data: payload,
      transformRequest: [decamelizeKeys],
    });
  }

  return { createPoamItem, isLoading, error };
}

export function usePoamItemUpdate(id: string) {
  const { execute, isLoading, error } = useDataApi<PoamItem>(
    null,
    {},
    { immediate: false },
  );

  async function updatePoamItem(payload: UpdatePoamItemRequest) {
    return execute(`/api/poam-items/${id}`, {
      method: 'PUT',
      data: payload,
      transformRequest: [decamelizeKeys],
    });
  }

  return { updatePoamItem, isLoading, error };
}

export function usePoamItemDelete() {
  const { execute, isLoading, error } = useDataApi<void>(
    null,
    {},
    { immediate: false },
  );

  async function deletePoamItem(id: string) {
    return execute(`/api/poam-items/${id}`, { method: 'DELETE' });
  }

  return { deletePoamItem, isLoading, error };
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export function useMilestonesList(poamItemId: string) {
  return useDataApi<PoamItemMilestone[]>(
    `/api/poam-items/${poamItemId}/milestones`,
  );
}

export function useMilestoneCreate(poamItemId: string) {
  const { execute, isLoading, error } = useDataApi<PoamItemMilestone>(
    null,
    {},
    { immediate: false },
  );

  async function createMilestone(payload: CreateMilestoneRequest) {
    return execute(`/api/poam-items/${poamItemId}/milestones`, {
      method: 'POST',
      data: payload,
      transformRequest: [decamelizeKeys],
    });
  }

  return { createMilestone, isLoading, error };
}

export function useMilestoneUpdate(poamItemId: string, milestoneId: string) {
  const { execute, isLoading, error } = useDataApi<PoamItemMilestone>(
    null,
    {},
    { immediate: false },
  );

  async function updateMilestone(payload: UpdateMilestoneRequest) {
    return execute(`/api/poam-items/${poamItemId}/milestones/${milestoneId}`, {
      method: 'PUT',
      data: payload,
      transformRequest: [decamelizeKeys],
    });
  }

  return { updateMilestone, isLoading, error };
}

export function useMilestoneDelete() {
  const { execute, isLoading, error } = useDataApi<void>(
    null,
    {},
    { immediate: false },
  );

  async function deleteMilestone(poamItemId: string, milestoneId: string) {
    return execute(`/api/poam-items/${poamItemId}/milestones/${milestoneId}`, {
      method: 'DELETE',
    });
  }

  return { deleteMilestone, isLoading, error };
}

// ─── Risk link helpers ────────────────────────────────────────────────────────

export function usePoamItemsByRisk(riskId: string) {
  return useDataApi<PoamItem[]>(
    `/api/poam-items?riskId=${encodeURIComponent(riskId)}`,
  );
}

// ─── Promote Risk to POAM (BCH-1186) ─────────────────────────────────────────

/**
 * Composable for POST /api/risks/:riskId/promote-to-poam.
 *
 * Promotes a risk in `investigating` status to a POAM item and transitions
 * the risk status to `mitigating-planned`. The returned POAM item includes
 * all milestones and risk links.
 *
 * Usage:
 *   const { promoteRiskToPoam, isLoading, error } = usePromoteRiskToPoam();
 *   const poamItem = await promoteRiskToPoam(riskId, { deadline: '...' });
 */
export function usePromoteRiskToPoam() {
  const { execute, isLoading, error } = useDataApi<PoamItem>(
    null,
    {},
    { immediate: false },
  );

  async function promoteRiskToPoam(
    riskId: string,
    payload: PromoteRiskToPoamRequest,
  ) {
    return execute(`/api/risks/${encodeURIComponent(riskId)}/promote-to-poam`, {
      method: 'POST',
      data: payload,
      transformRequest: [decamelizeKeys],
    });
  }

  return { promoteRiskToPoam, isLoading, error };
}

// ─── Status badge helper ──────────────────────────────────────────────────────

export function poamStatusBadgeClass(status: string): string {
  switch (status) {
    case 'open':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'in-progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'overdue':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    case 'risk-accepted':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

export function milestoneStatusDotClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'in-progress':
      return 'bg-blue-500';
    case 'open':
      return 'bg-gray-400';
    case 'cancelled':
      return 'bg-gray-300';
    default:
      return 'bg-gray-400';
  }
}

export function milestoneStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'in-progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function poamStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'in-progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'overdue':
      return 'Overdue';
    case 'risk-accepted':
      return 'Risk Accepted';
    default:
      return status;
  }
}
