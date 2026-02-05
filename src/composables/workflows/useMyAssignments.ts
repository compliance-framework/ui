import { ref, type Ref } from 'vue';
import { useDataApi } from '@/composables/axios';
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
  const assignments: Ref<StepExecution[]> = ref([]);
  const total = ref(0);
  const loading = ref(false);
  const error: Ref<string | null> = ref(null);

  const { execute: executeMyAssignments, response: axiosResponse } =
    useDataApi<MyAssignmentsResponse>(BASE_URL, null, { immediate: false });

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

      await executeMyAssignments(url);

      if (axiosResponse.value?.data) {
        const responseData = axiosResponse.value
          .data as unknown as MyAssignmentsResponse;

        assignments.value = responseData.data || [];
        total.value = responseData.total || 0;

        return {
          data: responseData.data || [],
          total: responseData.total || 0,
          limit: responseData.limit || 10,
          offset: responseData.offset || 0,
          hasMore: responseData.hasMore || false,
        };
      }

      throw new Error('No data returned from API');
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
      const params = new URLSearchParams();
      params.append('status', 'pending');
      params.append('status', 'in_progress');
      params.append('limit', '1');

      const url = `${BASE_URL}/my?${params.toString()}`;
      await executeMyAssignments(url);

      const responseData = axiosResponse.value?.data as unknown as
        | MyAssignmentsResponse
        | undefined;
      return responseData?.total ?? 0;
    } catch (err) {
      console.error('Failed to get assignment count:', err);
      return 0;
    }
  }

  const returnValue = {
    assignments,
    total,
    loading,
    error,
    fetchMyAssignments,
    getAssignmentCount,
  };

  console.log('[useMyAssignments] Returning:', returnValue);
  console.log(
    '[useMyAssignments] assignments in return:',
    returnValue.assignments,
  );

  return returnValue;
}
