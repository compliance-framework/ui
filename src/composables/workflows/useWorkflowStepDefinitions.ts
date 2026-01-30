import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import type {
  StepDefinition,
  StepDefinitionCreate,
  StepDefinitionUpdate,
  StepDependency,
} from '@/types/workflows';

const BASE_URL = '/api/workflows/steps';

/**
 * Composable for managing workflow step definitions.
 * Provides CRUD operations for step definitions within workflow templates.
 */
export function useWorkflowStepDefinitions() {
  const toast = useToast();
  const confirm = useConfirm();

  // List step definitions for a workflow
  const {
    data: steps,
    execute: fetchSteps,
    isFinished: stepsLoaded,
    error: stepsError,
  } = useDataApi<StepDefinition[]>(BASE_URL, null, { immediate: false });

  // Get single step definition
  const {
    data: step,
    execute: fetchStep,
    isFinished: stepLoaded,
    error: stepError,
  } = useDataApi<StepDefinition>(BASE_URL, null, { immediate: false });

  // Get step dependencies
  const {
    data: dependencies,
    execute: fetchDependencies,
    isFinished: dependenciesLoaded,
  } = useDataApi<StepDependency[]>(BASE_URL, null, { immediate: false });

  // Create step definition
  const { data: createdStep, execute: executeCreate } =
    useDataApi<StepDefinition>(
      BASE_URL,
      {
        method: 'POST',
        transformRequest: [decamelizeKeys],
      },
      { immediate: false },
    );

  // Update step definition
  const { data: updatedStep, execute: executeUpdate } =
    useDataApi<StepDefinition>(
      BASE_URL,
      {
        method: 'PUT',
        transformRequest: [decamelizeKeys],
      },
      { immediate: false },
    );

  // Delete step definition
  const { execute: executeDelete } = useDataApi<void>(
    BASE_URL,
    { method: 'DELETE' },
    { immediate: false },
  );

  /**
   * Fetch all step definitions for a workflow definition
   */
  async function listSteps(workflowDefinitionId: string) {
    await fetchSteps(
      `${BASE_URL}?workflow_definition_id=${workflowDefinitionId}`,
    );
    return steps.value;
  }

  /**
   * Fetch a single step definition by ID
   */
  async function getStep(id: string) {
    await fetchStep(`${BASE_URL}/${id}`);
    return step.value;
  }

  /**
   * Fetch dependencies for a step definition
   */
  async function getStepDependencies(id: string) {
    await fetchDependencies(`${BASE_URL}/${id}/dependencies`);
    return dependencies.value;
  }

  /**
   * Create a new step definition
   */
  async function createStep(
    data: StepDefinitionCreate,
    onSuccess?: (step: StepDefinition) => void,
  ) {
    try {
      await executeCreate({ data });
      toast.add({
        severity: 'success',
        summary: 'Step Created',
        detail: 'Step definition has been created successfully',
        life: 3000,
      });
      if (createdStep.value && onSuccess) {
        onSuccess(createdStep.value);
      }
      return createdStep.value;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Creating Step',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to create step definition',
        life: 3000,
      });
      throw error;
    }
  }

  /**
   * Update an existing step definition
   */
  async function updateStep(
    id: string,
    data: StepDefinitionUpdate,
    onSuccess?: (step: StepDefinition) => void,
  ) {
    try {
      await executeUpdate(`${BASE_URL}/${id}`, { data });
      toast.add({
        severity: 'success',
        summary: 'Step Updated',
        detail: 'Step definition has been updated successfully',
        life: 3000,
      });
      if (updatedStep.value && onSuccess) {
        onSuccess(updatedStep.value);
      }
      return updatedStep.value;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Updating Step',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to update step definition',
        life: 3000,
      });
      throw error;
    }
  }

  /**
   * Delete a step definition with confirmation
   */
  async function deleteStep(id: string, name: string, onSuccess?: () => void) {
    return new Promise<void>((resolve, reject) => {
      confirm.require({
        message: `Are you sure you want to delete the step "${name}"? This may affect dependent steps.`,
        header: 'Delete Step Definition',
        rejectProps: { label: 'Cancel', severity: 'secondary' },
        acceptProps: { label: 'Delete', severity: 'danger' },
        accept: async () => {
          try {
            await executeDelete(`${BASE_URL}/${id}`);
            toast.add({
              severity: 'success',
              summary: 'Step Deleted',
              detail: 'Step definition has been deleted successfully',
              life: 3000,
            });
            onSuccess?.();
            resolve();
          } catch (error) {
            toast.add({
              severity: 'error',
              summary: 'Error Deleting Step',
              detail:
                error instanceof Error
                  ? error.message
                  : 'Failed to delete step definition',
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
    steps,
    step,
    dependencies,
    stepsLoaded,
    stepLoaded,
    dependenciesLoaded,
    stepsError,
    stepError,
    createdStep,
    updatedStep,

    // Methods
    listSteps,
    getStep,
    getStepDependencies,
    createStep,
    updateStep,
    deleteStep,

    // Raw execute functions for advanced use
    fetchSteps,
    fetchStep,
    fetchDependencies,
  };
}
