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

    // BCH-1156: date inputs produce YYYY-MM-DD strings; the API requires RFC3339.
    // Passing a plain date string must result in an RFC3339 value in the URL.
    it('converts YYYY-MM-DD date strings to RFC3339 format in query params', async () => {
      const emptyResponse: MyAssignmentsResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      setMockResponse(emptyResponse);

      const { fetchMyAssignments } = useMyAssignments();
      await fetchMyAssignments({
        dueBefore: '2024-12-31',
        dueAfter: '2024-01-01',
      });

      const calledUrl = mockExecute.mock.calls[0][0] as string;
      // Must contain RFC3339 timestamps, not bare YYYY-MM-DD strings
      expect(calledUrl).toContain('due_before=2024-12-31T');
      expect(calledUrl).toContain('due_after=2024-01-01T');
      expect(calledUrl).not.toContain('due_before=2024-12-31&');
      expect(calledUrl).not.toContain('due_after=2024-01-01&');
      expect(calledUrl).not.toMatch(/due_before=2024-12-31$/);
      expect(calledUrl).not.toMatch(/due_after=2024-01-01$/);
    });

    // BCH-1156: dueBefore must use end-of-day so tasks due ON that date are included.
    // Sending start-of-day (T00:00:00Z) causes the API (due_date <= X) to exclude
    // tasks whose due_date is any time after midnight on the selected day.
    it('sends end-of-day timestamp for dueBefore so same-day tasks are included', async () => {
      const emptyResponse: MyAssignmentsResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      setMockResponse(emptyResponse);

      const { fetchMyAssignments } = useMyAssignments();
      await fetchMyAssignments({ dueBefore: '2026-05-28' });

      const calledUrl = mockExecute.mock.calls[0][0] as string;
      // Must be end-of-day (T23...) not start-of-day (T00...)
      expect(calledUrl).toContain('due_before=2026-05-28T23');
    });

    // BCH-1156: Go's time.Parse(time.RFC3339, ...) does not accept fractional seconds.
    // toISOString() always produces milliseconds (e.g. T23:59:59.999Z) which causes
    // a persistent 400 even after the YYYY-MM-DD → RFC3339 conversion is applied.
    it('formats date params without milliseconds so Go time.RFC3339 can parse them', async () => {
      const emptyResponse: MyAssignmentsResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      };

      setMockResponse(emptyResponse);

      const { fetchMyAssignments } = useMyAssignments();
      await fetchMyAssignments({
        dueBefore: '2026-05-28',
        dueAfter: '2026-05-26',
      });

      const calledUrl = mockExecute.mock.calls[0][0] as string;
      // Must not contain milliseconds (.000, .999, etc)
      expect(calledUrl).not.toMatch(/due_before=.*\.\d{3}/);
      expect(calledUrl).not.toMatch(/due_after=.*\.\d{3}/);
      // Must end with Z (UTC) after the seconds
      expect(calledUrl).toContain('due_before=2026-05-28T23%3A59%3A59Z');
      expect(calledUrl).toContain('due_after=2026-05-26T00%3A00%3A00Z');
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
        '/api/workflows/step-executions/my?status=in_progress&due_before=2024-12-31T23%3A59%3A59Z&due_after=2024-01-01T00%3A00%3A00Z&workflow_definition_id=workflow-123&limit=15&offset=5';
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
    // new Date('not-a-date').toISOString() throws RangeError; invalid strings must
    // be silently dropped so the API call still proceeds without the bad param.
    it('silently omits due date params when the date string is invalid', async () => {
      const emptyResponse: MyAssignmentsResponse = {
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      };
      setMockResponse(emptyResponse);

      const { fetchMyAssignments } = useMyAssignments();
      await expect(
        fetchMyAssignments({ dueBefore: 'not-a-date', dueAfter: 'also-bad' }),
      ).resolves.toBeDefined();

      const calledUrl = mockExecute.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain('due_before');
      expect(calledUrl).not.toContain('due_after');
    });

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
