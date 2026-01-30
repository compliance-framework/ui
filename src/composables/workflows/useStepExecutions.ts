import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import type {
  StepExecution,
  StepExecutionListParams,
  StepExecutionStatusUpdate,
  StepExecutionEvidenceSubmit,
  StepExecutionEvidence,
} from '@/types/workflows';

const BASE_URL = '/api/workflows/step-executions';

/**
 * Composable for managing step executions.
 * Provides operations for updating step status, submitting evidence, and marking steps as complete/failed.
 */
export function useStepExecutions() {
  const toast = useToast();
  const confirm = useConfirm();

  // List step executions for an execution
  const {
    data: stepExecutions,
    execute: fetchStepExecutions,
    isFinished: stepExecutionsLoaded,
    error: stepExecutionsError,
  } = useDataApi<StepExecution[]>(BASE_URL, null, { immediate: false });

  // Get single step execution
  const {
    data: stepExecution,
    execute: fetchStepExecution,
    isFinished: stepExecutionLoaded,
    error: stepExecutionError,
  } = useDataApi<StepExecution>(BASE_URL, null, { immediate: false });

  // Update step status
  const { data: updatedStepExecution, execute: executeUpdateStatus } =
    useDataApi<StepExecution>(
      BASE_URL,
      {
        method: 'PUT',
        transformRequest: [decamelizeKeys],
      },
      { immediate: false },
    );

  // Submit evidence
  const { data: submittedEvidence, execute: executeSubmitEvidence } =
    useDataApi<StepExecutionEvidence>(
      BASE_URL,
      { method: 'POST' },
      { immediate: false },
    );

  // Mark step as failed
  const { execute: executeFailStep } = useDataApi<StepExecution>(
    BASE_URL,
    {
      method: 'PUT',
      transformRequest: [decamelizeKeys],
    },
    { immediate: false },
  );

  /**
   * Fetch all step executions for a workflow execution
   */
  async function listStepExecutions(params?: StepExecutionListParams) {
    const queryParams = new URLSearchParams();
    if (params?.workflowExecutionId)
      queryParams.append('workflow_execution_id', params.workflowExecutionId);
    if (params?.status) queryParams.append('status', params.status);

    const url = queryParams.toString()
      ? `${BASE_URL}?${queryParams}`
      : BASE_URL;
    await fetchStepExecutions(url);
    return stepExecutions.value;
  }

  /**
   * Fetch a single step execution by ID
   */
  async function getStepExecution(id: string) {
    await fetchStepExecution(`${BASE_URL}/${id}`);
    return stepExecution.value;
  }

  /**
   * Update the status of a step execution
   */
  async function updateStepStatus(
    id: string,
    data: StepExecutionStatusUpdate,
    onSuccess?: (stepExecution: StepExecution) => void,
  ) {
    try {
      await executeUpdateStatus(`${BASE_URL}/${id}/status`, { data });

      const statusMessages: Record<string, string> = {
        in_progress: 'Step has been started',
        completed: 'Step has been completed',
        pending: 'Step status has been updated',
      };

      toast.add({
        severity: 'success',
        summary: 'Step Updated',
        detail: statusMessages[data.status] || 'Step status has been updated',
        life: 3000,
      });

      if (updatedStepExecution.value && onSuccess) {
        onSuccess(updatedStepExecution.value);
      }
      return updatedStepExecution.value;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Updating Step',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to update step status',
        life: 3000,
      });
      throw error;
    }
  }

  /**
   * Start working on a step (change status to in_progress)
   */
  async function startStep(
    id: string,
    onSuccess?: (stepExecution: StepExecution) => void,
  ) {
    return updateStepStatus(id, { status: 'in_progress' }, onSuccess);
  }

  /**
   * Complete a step (change status to completed)
   */
  async function completeStep(
    id: string,
    onSuccess?: (stepExecution: StepExecution) => void,
  ) {
    return updateStepStatus(id, { status: 'completed' }, onSuccess);
  }

  /**
   * Submit evidence for a step execution
   */
  async function submitEvidence(
    stepExecutionId: string,
    data: StepExecutionEvidenceSubmit,
    onSuccess?: (evidence: StepExecutionEvidence) => void,
  ) {
    try {
      // For file uploads, we need to use FormData
      if (data.file) {
        const formData = new FormData();
        formData.append('evidence_type', data.evidenceType);
        formData.append('file', data.file);

        await executeSubmitEvidence(`${BASE_URL}/${stepExecutionId}/evidence`, {
          data: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // For non-file evidence (attestation, link)
        await executeSubmitEvidence(`${BASE_URL}/${stepExecutionId}/evidence`, {
          data: {
            evidenceType: data.evidenceType,
            attestationText: data.attestationText,
            linkUrl: data.linkUrl,
          },
        });
      }

      toast.add({
        severity: 'success',
        summary: 'Evidence Submitted',
        detail: 'Evidence has been submitted successfully',
        life: 3000,
      });

      if (submittedEvidence.value && onSuccess) {
        onSuccess(submittedEvidence.value);
      }
      return submittedEvidence.value;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Submitting Evidence',
        detail:
          error instanceof Error ? error.message : 'Failed to submit evidence',
        life: 3000,
      });
      throw error;
    }
  }

  /**
   * Mark a step as failed with a reason
   */
  async function failStep(id: string, reason: string, onSuccess?: () => void) {
    return new Promise<void>((resolve, reject) => {
      confirm.require({
        message: `Are you sure you want to mark this step as failed? This may block dependent steps and could cause the workflow execution to fail.`,
        header: 'Mark Step as Failed',
        rejectProps: { label: 'Cancel', severity: 'secondary' },
        acceptProps: { label: 'Mark as Failed', severity: 'danger' },
        accept: async () => {
          try {
            await executeFailStep(`${BASE_URL}/${id}/fail`, {
              data: { reason },
            });
            toast.add({
              severity: 'warn',
              summary: 'Step Failed',
              detail: 'Step has been marked as failed',
              life: 3000,
            });
            onSuccess?.();
            resolve();
          } catch (error) {
            toast.add({
              severity: 'error',
              summary: 'Error Marking Step as Failed',
              detail:
                error instanceof Error
                  ? error.message
                  : 'Failed to mark step as failed',
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

  return {
    // Reactive data
    stepExecutions,
    stepExecution,
    stepExecutionsLoaded,
    stepExecutionLoaded,
    stepExecutionsError,
    stepExecutionError,
    updatedStepExecution,
    submittedEvidence,

    // Methods
    listStepExecutions,
    getStepExecution,
    updateStepStatus,
    startStep,
    completeStep,
    submitEvidence,
    failStep,

    // Raw execute functions for advanced use
    fetchStepExecutions,
    fetchStepExecution,
  };
}
