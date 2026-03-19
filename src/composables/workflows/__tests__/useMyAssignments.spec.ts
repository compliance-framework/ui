import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMyAssignments } from '../useMyAssignments';
import type { MyAssignmentsResponse } from '../useMyAssignments';
import type { StepExecution } from '@/types/workflows';

// Mock useDataApi
const mockExecute = vi.fn();
const mockData: { value: MyAssignmentsResponse | undefined } = {
  value: undefined,
};
const mockResponse: { value: { data: MyAssignmentsResponse } | undefined } = {
  value: undefined,
};
vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(() => ({
    data: mockData,
    execute: mockExecute,
    response: mockResponse,
  })),
}));

describe('useMyAssignments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData.value = undefined;
    mockResponse.value = undefined;
  });

  const setMockResponse = (response: MyAssignmentsResponse) => {
    mockExecute.mockImplementation(async () => {
      mockData.value = response;
      mockResponse.value = {
        data: response,
      };
      return response;
    });
  };

  describe('fetchMyAssignments', () => {
    it('fetches assignments with default parameters', async () => {
      const testResponse: MyAssignmentsResponse = {
        data: [
          {
            id: 'step-1',
            status: 'pending',
            workflowExecutionId: 'exec-1',
            workflowStepDefinitionId: 'def-1',
          } as StepExecution,
        ],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      setMockResponse(testResponse);

      const { fetchMyAssignments, assignments, total } = useMyAssignments();
      const result = await fetchMyAssignments();

      expect(mockExecute).toHaveBeenCalledWith(
        '/api/workflows/step-executions/my',
      );
      expect(result).toEqual(testResponse);
      expect(assignments.value).toEqual(testResponse.data);
      expect(total.value).toBe(1);
    });

    it('includes status filter in query params', async () => {
      const mockResponse: MyAssignmentsResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      setMockResponse(mockResponse);

      const { fetchMyAssignments } = useMyAssignments();
      await fetchMyAssignments({ status: 'pending' });

      expect(mockExecute).toHaveBeenCalledWith(
        '/api/workflows/step-executions/my?status=pending',
      );
    });

    it('includes pagination parameters', async () => {
      const mockResponse: MyAssignmentsResponse = {
        data: [],
        total: 50,
        limit: 20,
        offset: 20,
        hasMore: true,
      };

      setMockResponse(mockResponse);

      const { fetchMyAssignments } = useMyAssignments();
      await fetchMyAssignments({ limit: 20, offset: 20 });

      expect(mockExecute).toHaveBeenCalledWith(
        '/api/workflows/step-executions/my?limit=20&offset=20',
      );
    });

    it('includes all filter parameters', async () => {
      const mockResponse: MyAssignmentsResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      setMockResponse(mockResponse);

      const { fetchMyAssignments } = useMyAssignments();
      await fetchMyAssignments({
        status: 'in_progress',
        dueBefore: '2024-12-31',
        dueAfter: '2024-01-01',
        workflowDefinitionId: 'workflow-123',
        limit: 15,
        offset: 5,
      });

      const expectedUrl =
        '/api/workflows/step-executions/my?status=in_progress&due_before=2024-12-31&due_after=2024-01-01&workflow_definition_id=workflow-123&limit=15&offset=5';
      expect(mockExecute).toHaveBeenCalledWith(expectedUrl);
    });

    it('sets loading state during fetch', async () => {
      const testResponse: MyAssignmentsResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      let resolvePromise: (value: void) => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockExecute.mockImplementation(async () => {
        await promise;
        mockData.value = testResponse;
        mockResponse.value = {
          data: testResponse,
        };
        return testResponse;
      });

      const { fetchMyAssignments, loading } = useMyAssignments();

      expect(loading.value).toBe(false);

      const fetchPromise = fetchMyAssignments();
      expect(loading.value).toBe(true);

      resolvePromise!();
      await fetchPromise;

      expect(loading.value).toBe(false);
    });

    it('handles API errors gracefully', async () => {
      const mockError = new Error('Network error');
      mockExecute.mockRejectedValue(mockError);

      const { fetchMyAssignments, error, loading } = useMyAssignments();

      await expect(fetchMyAssignments()).rejects.toThrow('Network error');

      expect(error.value).toBe('Network error');
      expect(loading.value).toBe(false);
    });

    it('clears error state on successful fetch', async () => {
      const mockResponse: MyAssignmentsResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      // First call fails
      mockExecute.mockRejectedValueOnce(new Error('First error'));
      const { fetchMyAssignments, error } = useMyAssignments();

      try {
        await fetchMyAssignments();
      } catch {
        // Expected
      }
      expect(error.value).toBe('First error');

      // Second call succeeds
      setMockResponse(mockResponse);
      await fetchMyAssignments();

      expect(error.value).toBeNull();
    });

    it('handles non-Error exceptions', async () => {
      mockExecute.mockRejectedValue('String error');

      const { fetchMyAssignments, error } = useMyAssignments();

      await expect(fetchMyAssignments()).rejects.toBe('String error');

      expect(error.value).toBe('Failed to fetch assignments');
    });
  });

  describe('getAssignmentCount', () => {
    it('fetches count with pending, in_progress, and overdue statuses', async () => {
      const mockResponse: MyAssignmentsResponse = {
        data: [],
        total: 5,
        limit: 1,
        offset: 0,
        hasMore: false,
      };

      setMockResponse(mockResponse);

      const { getAssignmentCount } = useMyAssignments();
      const count = await getAssignmentCount();

      expect(count).toBe(5);

      // Verify that both status values are appended separately
      const callUrl = mockExecute.mock.calls[0][0] as string;
      expect(callUrl).toContain('status=pending');
      expect(callUrl).toContain('status=in_progress');
      expect(callUrl).toContain('status=overdue');
      expect(callUrl).toContain('limit=1');
    });

    it('returns 0 on error', async () => {
      mockExecute.mockRejectedValue(new Error('API error'));

      const { getAssignmentCount } = useMyAssignments();
      const count = await getAssignmentCount();

      expect(count).toBe(0);
    });

    it('uses minimal limit for efficiency', async () => {
      const mockResponse: MyAssignmentsResponse = {
        data: [],
        total: 100,
        limit: 1,
        offset: 0,
        hasMore: false,
      };

      setMockResponse(mockResponse);

      const { getAssignmentCount } = useMyAssignments();
      await getAssignmentCount();

      const callUrl = mockExecute.mock.calls[0][0] as string;
      expect(callUrl).toContain('limit=1');
    });
  });

  describe('state management', () => {
    it('maintains separate state for multiple instances', async () => {
      const mockResponse1: MyAssignmentsResponse = {
        data: [
          {
            id: 'step-1',
            status: 'pending',
          } as StepExecution,
        ],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      const mockResponse2: MyAssignmentsResponse = {
        data: [
          {
            id: 'step-2',
            status: 'in_progress',
          } as StepExecution,
        ],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      let callCount = 0;
      mockExecute.mockImplementation(async () => {
        const response = callCount === 0 ? mockResponse1 : mockResponse2;
        mockData.value = response;
        mockResponse.value = {
          data: response,
        };
        callCount++;
        return response;
      });

      const instance1 = useMyAssignments();
      const instance2 = useMyAssignments();

      await instance1.fetchMyAssignments();
      await instance2.fetchMyAssignments();

      expect(instance1.assignments.value[0].id).toBe('step-1');
      expect(instance2.assignments.value[0].id).toBe('step-2');
    });

    it('updates total when fetching assignments', async () => {
      const mockResponse: MyAssignmentsResponse = {
        data: [],
        total: 42,
        limit: 10,
        offset: 0,
        hasMore: true,
      };

      setMockResponse(mockResponse);

      const { fetchMyAssignments, total } = useMyAssignments();

      expect(total.value).toBe(0);

      await fetchMyAssignments();

      expect(total.value).toBe(42);
    });
  });

  describe('pagination scenarios', () => {
    it('handles hasMore flag correctly', async () => {
      const mockResponse: MyAssignmentsResponse = {
        data: new Array(10).fill(null).map(
          (_, i) =>
            ({
              id: `step-${i}`,
              status: 'pending',
            }) as StepExecution,
        ),
        total: 25,
        limit: 10,
        offset: 0,
        hasMore: true,
      };

      setMockResponse(mockResponse);

      const { fetchMyAssignments } = useMyAssignments();
      const result = await fetchMyAssignments({ limit: 10, offset: 0 });

      expect(result.hasMore).toBe(true);
      expect(result.data.length).toBe(10);
    });

    it('handles last page correctly', async () => {
      const mockResponse: MyAssignmentsResponse = {
        data: new Array(5).fill(null).map(
          (_, i) =>
            ({
              id: `step-${i}`,
              status: 'pending',
            }) as StepExecution,
        ),
        total: 25,
        limit: 10,
        offset: 20,
        hasMore: false,
      };

      setMockResponse(mockResponse);

      const { fetchMyAssignments } = useMyAssignments();
      const result = await fetchMyAssignments({ limit: 10, offset: 20 });

      expect(result.hasMore).toBe(false);
      expect(result.data.length).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('handles empty results', async () => {
      const mockResponse: MyAssignmentsResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      setMockResponse(mockResponse);

      const { fetchMyAssignments, assignments, total } = useMyAssignments();
      await fetchMyAssignments();

      expect(assignments.value).toEqual([]);
      expect(total.value).toBe(0);
    });

    it('handles undefined filter values gracefully', async () => {
      const mockResponse: MyAssignmentsResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      setMockResponse(mockResponse);

      const { fetchMyAssignments } = useMyAssignments();
      await fetchMyAssignments({
        status: undefined,
        dueBefore: undefined,
        dueAfter: undefined,
        workflowDefinitionId: undefined,
      });

      expect(mockExecute).toHaveBeenCalledWith(
        '/api/workflows/step-executions/my',
      );
    });

    it('preserves previous data on error', async () => {
      const mockResponse: MyAssignmentsResponse = {
        data: [
          {
            id: 'step-1',
            status: 'pending',
          } as StepExecution,
        ],
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      setMockResponse(mockResponse);

      const { fetchMyAssignments, assignments, total } = useMyAssignments();
      await fetchMyAssignments();

      expect(assignments.value.length).toBe(1);
      expect(total.value).toBe(1);

      // Second call fails
      mockExecute.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetchMyAssignments();
      } catch {
        // Expected
      }

      // Data should remain unchanged
      expect(assignments.value.length).toBe(1);
      expect(total.value).toBe(1);
    });
  });
});
