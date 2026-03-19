import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import type {
  WorkflowDefinition,
  WorkflowDefinitionCreate,
  WorkflowDefinitionUpdate,
  WorkflowDefinitionListParams,
} from '@/types/workflows';

const BASE_URL = '/api/workflows/definitions';

function buildDefinitionPayload(
  data: WorkflowDefinitionCreate | WorkflowDefinitionUpdate,
) {
  const { gracePeriodDays, ...rest } = data;
  return {
    ...rest,
    ...(gracePeriodDays != null ? { gracePeriodDays } : {}),
  };
}

/**
 * Composable for managing workflow definitions.
 * Provides CRUD operations for workflow definition templates.
 */
export function useWorkflowDefinitions() {
  const toast = useToast();
  const confirm = useConfirm();

  // List workflow definitions
  const {
    data: definitions,
    execute: fetchDefinitions,
    isFinished: definitionsLoaded,
    error: definitionsError,
  } = useDataApi<WorkflowDefinition[]>(BASE_URL, null, { immediate: false });

  // Get single definition
  const {
    data: definition,
    execute: fetchDefinition,
    isFinished: definitionLoaded,
    error: definitionError,
  } = useDataApi<WorkflowDefinition>(BASE_URL, null, { immediate: false });

  // Create definition
  const { data: createdDefinition, execute: executeCreate } =
    useDataApi<WorkflowDefinition>(
      BASE_URL,
      {
        method: 'POST',
        transformRequest: [decamelizeKeys],
      },
      { immediate: false },
    );

  // Update definition
  const { data: updatedDefinition, execute: executeUpdate } =
    useDataApi<WorkflowDefinition>(
      BASE_URL,
      {
        method: 'PUT',
        transformRequest: [decamelizeKeys],
      },
      { immediate: false },
    );

  // Delete definition
  const { execute: executeDelete } = useDataApi<void>(
    BASE_URL,
    { method: 'DELETE' },
    { immediate: false },
  );

  /**
   * Fetch all workflow definitions with optional filters
   */
  async function listDefinitions(params?: WorkflowDefinitionListParams) {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);

    const url = queryParams.toString()
      ? `${BASE_URL}?${queryParams}`
      : BASE_URL;
    await fetchDefinitions(url);
    return definitions.value;
  }

  /**
   * Fetch a single workflow definition by ID
   */
  async function getDefinition(id: string) {
    await fetchDefinition(`${BASE_URL}/${id}`);
    return definition.value;
  }

  /**
   * Create a new workflow definition
   */
  async function createDefinition(
    data: WorkflowDefinitionCreate,
    onSuccess?: (definition: WorkflowDefinition) => void,
  ) {
    try {
      await executeCreate({ data: buildDefinitionPayload(data) });
      toast.add({
        severity: 'success',
        summary: 'Definition Created',
        detail: 'Workflow definition has been created successfully',
        life: 3000,
      });
      if (createdDefinition.value && onSuccess) {
        onSuccess(createdDefinition.value);
      }
      return createdDefinition.value;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Creating Definition',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to create workflow definition',
        life: 3000,
      });
      throw error;
    }
  }

  /**
   * Update an existing workflow definition
   */
  async function updateDefinition(
    id: string,
    data: WorkflowDefinitionUpdate,
    onSuccess?: (definition: WorkflowDefinition) => void,
  ) {
    try {
      await executeUpdate(`${BASE_URL}/${id}`, {
        data: buildDefinitionPayload(data),
      });
      toast.add({
        severity: 'success',
        summary: 'Definition Updated',
        detail: 'Workflow definition has been updated successfully',
        life: 3000,
      });
      if (updatedDefinition.value && onSuccess) {
        onSuccess(updatedDefinition.value);
      }
      return updatedDefinition.value;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Updating Definition',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to update workflow definition',
        life: 3000,
      });
      throw error;
    }
  }

  /**
   * Delete a workflow definition with confirmation
   */
  async function deleteDefinition(
    id: string,
    name: string,
    onSuccess?: () => void,
  ) {
    return new Promise<void>((resolve, reject) => {
      confirm.require({
        message: `Are you sure you want to delete the workflow definition "${name}"? This action cannot be undone.`,
        header: 'Delete Workflow Definition',
        rejectProps: { label: 'Cancel', severity: 'secondary' },
        acceptProps: { label: 'Delete', severity: 'danger' },
        accept: async () => {
          try {
            await executeDelete(`${BASE_URL}/${id}`);
            toast.add({
              severity: 'success',
              summary: 'Definition Deleted',
              detail: 'Workflow definition has been deleted successfully',
              life: 3000,
            });
            onSuccess?.();
            resolve();
          } catch (error) {
            toast.add({
              severity: 'error',
              summary: 'Error Deleting Definition',
              detail:
                error instanceof Error
                  ? error.message
                  : 'Failed to delete workflow definition',
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
    definitions,
    definition,
    definitionsLoaded,
    definitionLoaded,
    definitionsError,
    definitionError,
    createdDefinition,
    updatedDefinition,

    // Methods
    listDefinitions,
    getDefinition,
    createDefinition,
    updateDefinition,
    deleteDefinition,

    // Raw execute functions for advanced use
    fetchDefinitions,
    fetchDefinition,
  };
}
