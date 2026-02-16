import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStepExecutions } from '../useStepExecutions';
import type { StepExecution } from '@/types/workflows';

const mockToastAdd = vi.fn();
const mockUseDataApi = vi.fn();
const mockConfirmRequire = vi.fn();
const mockUserStore = {
  user: {
    id: 'user-1',
    email: 'owner@example.com',
  },
};

vi.mock('@/composables/axios', () => ({
  useDataApi: (...args: unknown[]) => mockUseDataApi(...args),
  decamelizeKeys: vi.fn((data) => JSON.stringify(data)),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: mockToastAdd,
  }),
}));

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: mockConfirmRequire,
  }),
}));

vi.mock('@/stores/auth', () => ({
  useUserStore: () => mockUserStore,
}));

interface ApiMock {
  data: { value: unknown };
  execute: ReturnType<typeof vi.fn>;
  isFinished: { value: boolean };
  error: { value: unknown };
  response: { value: unknown };
}

function createApiMock(): ApiMock {
  return {
    data: { value: undefined },
    execute: vi.fn(),
    isFinished: { value: true },
    error: { value: null },
    response: { value: undefined },
  };
}

describe('useStepExecutions reassignment', () => {
  let apiMocks: ApiMock[];

  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks = [];

    mockUseDataApi.mockImplementation(() => {
      const next = createApiMock();
      apiMocks.push(next);
      return next;
    });
  });

  it('calls the reassign endpoint with expected payload', async () => {
    const expected: StepExecution = {
      id: 'step-1',
      status: 'pending',
      workflowExecutionId: 'exec-1',
      workflowStepDefinitionId: 'def-1',
      assignedToType: 'email',
      assignedToId: 'new-owner@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const composable = useStepExecutions();
    const reassignApi = apiMocks[8];
    reassignApi.execute.mockImplementation(async () => {
      reassignApi.data.value = expected;
    });

    const result = await composable.reassignStepExecution('step-1', {
      assignedToType: 'email',
      assignedToId: 'new-owner@example.com',
      reason: 'Coverage handoff',
    });

    expect(reassignApi.execute).toHaveBeenCalledWith(
      '/api/workflows/step-executions/step-1/reassign',
      {
        data: {
          assignedToType: 'email',
          assignedToId: 'new-owner@example.com',
          reason: 'Coverage handoff',
        },
      },
    );
    expect(result).toEqual(expected);
  });

  it('registers kebab-case transform for reassignment API', () => {
    useStepExecutions();

    const reassignCall = mockUseDataApi.mock.calls[8];
    const config = reassignCall[1] as { transformRequest?: unknown[] };
    expect(config.transformRequest).toBeDefined();
    expect(Array.isArray(config.transformRequest)).toBe(true);
    expect(config.transformRequest?.length).toBeGreaterThan(0);
  });

  it('invokes success callback and shows success toast', async () => {
    const expected: StepExecution = {
      id: 'step-2',
      status: 'blocked',
      workflowExecutionId: 'exec-2',
      workflowStepDefinitionId: 'def-2',
      assignedToType: 'email',
      assignedToId: 'delegate@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const onSuccess = vi.fn();

    const composable = useStepExecutions();
    const reassignApi = apiMocks[8];
    reassignApi.execute.mockImplementation(async () => {
      reassignApi.data.value = expected;
    });

    await composable.reassignStepExecution(
      'step-2',
      {
        assignedToType: 'email',
        assignedToId: 'delegate@example.com',
      },
      onSuccess,
    );

    expect(onSuccess).toHaveBeenCalledWith(expected);
    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Task Reassigned',
      }),
    );
  });

  it('propagates reassignment errors and shows error toast', async () => {
    const composable = useStepExecutions();
    const reassignApi = apiMocks[8];
    reassignApi.execute.mockRejectedValue(new Error('Invalid assignee'));

    await expect(
      composable.reassignStepExecution('step-3', {
        assignedToType: 'email',
        assignedToId: 'invalid',
      }),
    ).rejects.toThrow('Invalid assignee');

    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Reassignment Failed',
        detail: 'Invalid assignee',
      }),
    );
  });
});
