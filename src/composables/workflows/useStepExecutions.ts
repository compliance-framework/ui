import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useUserStore } from '@/stores/auth';
import type {
  StepExecution,
  StepExecutionListParams,
  StepExecutionStatusUpdate,
  StepTransitionRequest,
  StepExecutionEvidenceSubmit,
  StepExecutionEvidence,
  CanTransitionResponse,
  EvidenceRequirement,
} from '@/types/workflows';

const BASE_URL = '/api/workflows/step-executions';

/**
 * Composable for managing step executions.
 * Provides operations for updating step status, submitting evidence, and marking steps as complete/failed.
 */
export function useStepExecutions() {
  const toast = useToast();
  const confirm = useConfirm();
  const userStore = useUserStore();

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

  // Transition step (new API)
  const { data: transitionedStep, execute: executeTransition } =
    useDataApi<StepExecution>(
      BASE_URL,
      {
        method: 'PUT',
        transformRequest: [decamelizeKeys],
      },
      { immediate: false },
    );

  // Get evidence requirements
  const {
    data: evidenceRequirements,
    execute: executeGetEvidenceRequirements,
  } = useDataApi<EvidenceRequirement[]>(BASE_URL, null, { immediate: false });

  // Check if user can transition
  const { data: canTransitionData, execute: executeCanTransition } =
    useDataApi<CanTransitionResponse>(BASE_URL, null, { immediate: false });

  // Legacy: Update step status (kept for backward compatibility)
  const { data: updatedStepExecution, execute: executeUpdateStatus } =
    useDataApi<StepExecution>(
      BASE_URL,
      {
        method: 'PUT',
        transformRequest: [decamelizeKeys],
      },
      { immediate: false },
    );

  // Legacy: Submit evidence (kept for backward compatibility, but uses transition internally)
  const { data: submittedEvidence } = useDataApi<StepExecutionEvidence>(
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
   * Transition a step execution status with evidence and role verification (NEW API)
   */
  async function transitionStep(
    id: string,
    status: 'in_progress' | 'completed',
    evidence?: StepExecutionEvidenceSubmit[],
    notes?: string,
    onSuccess?: (stepExecution: StepExecution) => void,
  ) {
    try {
      const currentUser = userStore.user;
      if (!currentUser || !currentUser.id) {
        throw new Error('User not authenticated');
      }

      // Transform evidence to match API expectations
      const apiEvidence = evidence?.map((ev) => {
        // Determine media type based on evidence type or file
        let mediaType = 'application/octet-stream';
        if (ev.evidenceType === 'screenshot') {
          mediaType = 'image/png';
        } else if (ev.file?.type) {
          mediaType = ev.file.type;
        } else if (ev.fileName) {
          // Guess from extension
          const ext = ev.fileName.split('.').pop()?.toLowerCase();
          const mimeTypes: Record<string, string> = {
            pdf: 'application/pdf',
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            txt: 'text/plain',
            json: 'application/json',
            xml: 'application/xml',
          };
          if (ext && ext in mimeTypes) {
            mediaType = mimeTypes[ext];
          }
        }

        return {
          evidenceType: ev.evidenceType,
          name: ev.fileName || ev.evidenceType,
          description: ev.attestationText || ev.linkUrl || '',
          // Use the new file-content field for base64 data
          fileContent: ev.fileData,
          mediaType: mediaType,
          // Keep filePath for link URLs
          filePath: ev.linkUrl,
          fileSize: ev.fileSize,
          // Only use metadata for actual metadata, not file content
          metadata: ev.metadata,
        };
      });

      const transitionRequest: StepTransitionRequest = {
        status,
        evidence: apiEvidence as StepExecutionEvidenceSubmit[],
        notes,
        userId: currentUser.id,
        userType: 'user',
      };

      await executeTransition(`${BASE_URL}/${id}/transition`, {
        data: transitionRequest,
      });

      const statusMessages: Record<string, string> = {
        in_progress: 'Step has been started',
        completed: 'Step has been completed',
      };

      toast.add({
        severity: 'success',
        summary: 'Step Updated',
        detail: statusMessages[status] || 'Step status has been updated',
        life: 3000,
      });

      if (transitionedStep.value && onSuccess) {
        onSuccess(transitionedStep.value);
      }
      return transitionedStep.value;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update step status';

      // Check if it's a permission error (403)
      const severity =
        errorMessage.includes('permission') ||
        errorMessage.includes('not assigned')
          ? 'warn'
          : 'error';

      toast.add({
        severity,
        summary:
          severity === 'warn' ? 'Permission Denied' : 'Error Updating Step',
        detail: errorMessage,
        life: 3000,
      });
      throw error;
    }
  }

  /**
   * Get evidence requirements for a step execution
   */
  async function getEvidenceRequirements(
    id: string,
  ): Promise<EvidenceRequirement[]> {
    try {
      await executeGetEvidenceRequirements(
        `${BASE_URL}/${id}/evidence-requirements`,
      );
      return evidenceRequirements.value || [];
    } catch (error) {
      console.error('Failed to get evidence requirements:', error);
      return [];
    }
  }

  /**
   * Check if current user can transition a step
   */
  async function canTransition(id: string): Promise<boolean> {
    try {
      const currentUser = userStore.user;
      if (!currentUser || !currentUser.id) {
        console.warn('[canTransition] No current user or user ID');
        return false;
      }

      const queryParams = new URLSearchParams({
        user_id: currentUser.id,
        user_type: 'user',
      });

      const url = `${BASE_URL}/${id}/can-transition?${queryParams}`;
      console.log('[canTransition] Checking permission:', {
        url,
        userId: currentUser.id,
        userType: 'user',
      });

      await executeCanTransition(url);

      console.log('[canTransition] Response:', canTransitionData.value);

      const result = canTransitionData.value?.canTransition || false;
      console.log('[canTransition] Result:', result);

      return result;
    } catch (error) {
      console.error(
        '[canTransition] Failed to check transition permission:',
        error,
      );
      return false;
    }
  }

  /**
   * Update the status of a step execution (LEGACY - kept for backward compatibility)
   * @deprecated Use transitionStep instead
   */
  async function updateStepStatus(
    id: string,
    data: StepExecutionStatusUpdate,
    onSuccess?: (stepExecution: StepExecution) => void,
  ) {
    // Use the new transition API
    if (data.status === 'in_progress' || data.status === 'completed') {
      return transitionStep(id, data.status, undefined, undefined, onSuccess);
    }

    // Fallback to old API for other statuses (if needed)
    try {
      await executeUpdateStatus(`${BASE_URL}/${id}/status`, { data });

      const statusMessages: Record<string, string> = {
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
    return transitionStep(id, 'in_progress', undefined, undefined, onSuccess);
  }

  /**
   * Complete a step (change status to completed) with optional evidence and notes
   */
  async function completeStep(
    id: string,
    evidence?: StepExecutionEvidenceSubmit[],
    notes?: string,
    onSuccess?: (stepExecution: StepExecution) => void,
  ) {
    return transitionStep(id, 'completed', evidence, notes, onSuccess);
  }

  /**
   * Submit evidence for a step execution (LEGACY - evidence should be submitted with completeStep)
   * @deprecated Evidence is now submitted as part of the transition request in completeStep()
   *
   * This function is kept for backward compatibility but should not be used in new code.
   * Instead, collect evidence and pass it to completeStep().
   */
  async function submitEvidence(
    stepExecutionId: string,
    data: StepExecutionEvidenceSubmit,
    onSuccess?: (evidence: StepExecutionEvidence) => void,
  ) {
    console.warn(
      'submitEvidence is deprecated. Evidence should be submitted with completeStep() using the new transition API.',
    );

    // For backward compatibility, we'll show a success message but explain the new flow
    toast.add({
      severity: 'info',
      summary: 'Evidence Collected',
      detail: 'Evidence will be submitted when the step is completed',
      life: 3000,
    });

    // Return a mock evidence object for compatibility
    const mockEvidence: StepExecutionEvidence = {
      id: 'temp-' + Date.now(),
      stepExecutionId,
      evidenceType: data.evidenceType,
      attestationText: data.attestationText,
      linkUrl: data.linkUrl,
      submittedBy: userStore.user?.id || 'unknown',
      submittedAt: new Date().toISOString(),
    };

    if (onSuccess) {
      onSuccess(mockEvidence);
    }

    return mockEvidence;
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
    transitionedStep,
    evidenceRequirements,
    canTransitionData,
    updatedStepExecution,
    submittedEvidence,

    // New API methods
    transitionStep,
    getEvidenceRequirements,
    canTransition,

    // Methods
    listStepExecutions,
    getStepExecution,
    startStep,
    completeStep,
    failStep,

    // Legacy methods (backward compatibility)
    updateStepStatus,
    submitEvidence,

    // Raw execute functions for advanced use
    fetchStepExecutions,
    fetchStepExecution,
    executeCanTransition,
    executeGetEvidenceRequirements,
  };
}
