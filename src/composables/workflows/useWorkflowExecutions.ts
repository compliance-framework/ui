import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useUserStore } from '@/stores/auth';
import type {
  WorkflowExecution,
  WorkflowExecutionCreate,
  WorkflowExecutionListParams,
  WorkflowExecutionStatusDetails,
  WorkflowExecutionMetrics,
} from '@/types/workflows';

const BASE_URL = '/api/workflows/executions';

/**
 * Composable for managing workflow executions.
 * Provides operations for triggering, monitoring, and managing workflow executions.
 */
export function useWorkflowExecutions() {
  const toast = useToast();
  const confirm = useConfirm();
  const userStore = useUserStore();

  // List workflow executions
  const {
    data: executions,
    execute: fetchExecutions,
    isFinished: executionsLoaded,
    error: executionsError,
  } = useDataApi<WorkflowExecution[]>(BASE_URL, null, { immediate: false });

  // Get single execution
  const {
    data: execution,
    execute: fetchExecution,
    isFinished: executionLoaded,
    error: executionError,
  } = useDataApi<WorkflowExecution>(BASE_URL, null, { immediate: false });

  // Get execution status
  const {
    data: executionStatus,
    execute: fetchExecutionStatus,
    isFinished: executionStatusLoaded,
  } = useDataApi<WorkflowExecutionStatusDetails>(BASE_URL, null, {
    immediate: false,
  });

  // Get execution metrics
  const {
    data: executionMetrics,
    execute: fetchExecutionMetrics,
    isFinished: executionMetricsLoaded,
  } = useDataApi<WorkflowExecutionMetrics>(BASE_URL, null, {
    immediate: false,
  });

  // Start execution
  const { data: startedExecution, execute: executeStart } =
    useDataApi<WorkflowExecution>(
      BASE_URL,
      {
        method: 'POST',
        transformRequest: [decamelizeKeys],
      },
      { immediate: false },
    );

  // Cancel execution
  const { execute: executeCancel } = useDataApi<WorkflowExecution>(
    BASE_URL,
    {
      method: 'PUT',
      transformRequest: [decamelizeKeys],
    },
    { immediate: false },
  );

  // Retry execution
  const { data: retriedExecution, execute: executeRetry } =
    useDataApi<WorkflowExecution>(
      BASE_URL,
      { method: 'POST' },
      { immediate: false },
    );

  /**
   * Fetch all workflow executions with optional filters
   */
  async function listExecutions(params?: WorkflowExecutionListParams) {
    const queryParams = new URLSearchParams();
    if (params?.workflowInstanceId)
      queryParams.append('workflow_instance_id', params.workflowInstanceId);
    if (params?.status) queryParams.append('status', params.status);

    const url = queryParams.toString()
      ? `${BASE_URL}?${queryParams}`
      : BASE_URL;
    await fetchExecutions(url);
    return executions.value;
  }

  /**
   * Fetch a single workflow execution by ID
   */
  async function getExecution(id: string) {
    await fetchExecution(`${BASE_URL}/${id}`);
    return execution.value;
  }

  /**
   * Fetch detailed status for an execution
   */
  async function getExecutionStatus(id: string) {
    await fetchExecutionStatus(`${BASE_URL}/${id}/status`);
    return executionStatus.value;
  }

  /**
   * Fetch metrics for an execution
   */
  async function getExecutionMetrics(id: string) {
    await fetchExecutionMetrics(`${BASE_URL}/${id}/metrics`);
    return executionMetrics.value;
  }

  /**
   * Start a new workflow execution (manual trigger)
   */
  async function startExecution(
    data: WorkflowExecutionCreate,
    onSuccess?: (execution: WorkflowExecution) => void,
  ) {
    return new Promise<WorkflowExecution | undefined>((resolve, reject) => {
      confirm.require({
        message:
          'Are you sure you want to start this workflow execution? This will create tasks for all defined steps.',
        header: 'Start Workflow Execution',
        rejectProps: { label: 'Cancel', severity: 'secondary' },
        acceptProps: { label: 'Start Execution', severity: 'primary' },
        accept: async () => {
          try {
            // Add triggered-by and triggered-by-id from current user if not provided
            const executionData = {
              ...data,
              triggeredBy: data.triggeredBy || 'manual',
              triggeredById: data.triggeredById || userStore.user?.id,
            };

            await executeStart({ data: executionData });
            toast.add({
              severity: 'success',
              summary: 'Execution Started',
              detail: 'Workflow execution has been started successfully',
              life: 3000,
            });
            if (startedExecution.value && onSuccess) {
              onSuccess(startedExecution.value);
            }
            resolve(startedExecution.value);
          } catch (error) {
            toast.add({
              severity: 'error',
              summary: 'Error Starting Execution',
              detail:
                error instanceof Error
                  ? error.message
                  : 'Failed to start workflow execution',
              life: 3000,
            });
            reject(error);
          }
        },
        reject: () => {
          resolve(undefined);
        },
      });
    });
  }

  /**
   * Cancel a running workflow execution
   */
  async function cancelExecution(
    id: string,
    reason: string,
    onSuccess?: () => void,
  ) {
    return new Promise<void>((resolve, reject) => {
      confirm.require({
        message:
          'Are you sure you want to cancel this workflow execution? All pending steps will be marked as cancelled.',
        header: 'Cancel Workflow Execution',
        rejectProps: { label: 'Keep Running', severity: 'secondary' },
        acceptProps: { label: 'Cancel Execution', severity: 'danger' },
        accept: async () => {
          try {
            await executeCancel(`${BASE_URL}/${id}/cancel`, {
              data: { reason },
            });
            toast.add({
              severity: 'success',
              summary: 'Execution Cancelled',
              detail: 'Workflow execution has been cancelled',
              life: 3000,
            });
            onSuccess?.();
            resolve();
          } catch (error) {
            toast.add({
              severity: 'error',
              summary: 'Error Cancelling Execution',
              detail:
                error instanceof Error
                  ? error.message
                  : 'Failed to cancel workflow execution',
              life: 3000,
            });
            reject(error);
          }
        },
        reject: () => {
          resolve();
        },
      });
    });
  }

  /**
   * Retry a failed workflow execution
   */
  async function retryExecution(
    id: string,
    onSuccess?: (execution: WorkflowExecution) => void,
  ) {
    try {
      await executeRetry(`${BASE_URL}/${id}/retry`);
      toast.add({
        severity: 'success',
        summary: 'Execution Retried',
        detail: 'A new execution has been started from the failed execution',
        life: 3000,
      });
      if (retriedExecution.value && onSuccess) {
        onSuccess(retriedExecution.value);
      }
      return retriedExecution.value;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Retrying Execution',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to retry workflow execution',
        life: 3000,
      });
      throw error;
    }
  }

  return {
    // Reactive data
    executions,
    execution,
    executionStatus,
    executionMetrics,
    executionsLoaded,
    executionLoaded,
    executionStatusLoaded,
    executionMetricsLoaded,
    executionsError,
    executionError,
    startedExecution,
    retriedExecution,

    // Methods
    listExecutions,
    getExecution,
    getExecutionStatus,
    getExecutionMetrics,
    startExecution,
    cancelExecution,
    retryExecution,

    // Raw execute functions for advanced use
    fetchExecutions,
    fetchExecution,
    fetchExecutionStatus,
    fetchExecutionMetrics,
  };
}
