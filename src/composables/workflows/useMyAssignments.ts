import { ref, type Ref } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { StepExecution } from '@/types/workflows';

const BASE_URL = '/api/workflows/step-executions';

export interface MyAssignmentsFilter {
  status?: string;
  dueBefore?: string;
  dueAfter?: string;
  workflowDefinitionId?: string;
  limit?: number;
  offset?: number;
}

export interface MyAssignmentsResponse {
  data: StepExecution[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function useMyAssignments() {
  const axios = useAuthenticatedInstance();

  const assignments: Ref<StepExecution[]> = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const error: Ref<string | null> = ref(null);

  /**
   * Fetch user's assigned step executions
   */
  async function fetchMyAssignments(
    filter: MyAssignmentsFilter = {},
  ): Promise<MyAssignmentsResponse> {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();

      if (filter.status) params.append('status', filter.status);
      if (filter.dueBefore) params.append('due_before', filter.dueBefore);
      if (filter.dueAfter) params.append('due_after', filter.dueAfter);
      if (filter.workflowDefinitionId)
        params.append('workflow_definition_id', filter.workflowDefinitionId);
      if (filter.limit) params.append('limit', filter.limit.toString());
      if (filter.offset) params.append('offset', filter.offset.toString());

      const queryString = params.toString();
      const url = queryString
        ? `${BASE_URL}/my?${queryString}`
        : `${BASE_URL}/my`;

      const response = await axios.get<MyAssignmentsResponse>(url);

      assignments.value = response.data.data;
      total.value = response.data.total;

      return response.data;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to fetch assignments';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Get count of pending/in-progress assignments
   */
  async function getAssignmentCount(): Promise<number> {
    try {
      const response = await fetchMyAssignments({
        limit: 1,
        status: 'pending,in_progress',
      });
      return response.total;
    } catch (err) {
      console.error('Failed to get assignment count:', err);
      return 0;
    }
  }

  return {
    assignments,
    total,
    loading,
    error,
    fetchMyAssignments,
    getAssignmentCount,
  };
}
