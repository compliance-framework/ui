import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import type {
  ControlRelationship,
  ControlRelationshipCreate,
  ControlRelationshipListParams,
} from '@/types/workflows';

const BASE_URL = '/api/workflows/control-relationships';

/**
 * Composable for managing control relationships.
 * Links workflow definitions to specific controls from catalogs.
 */
export function useControlRelationships() {
  const toast = useToast();
  const confirm = useConfirm();

  // List control relationships
  const {
    data: relationships,
    execute: fetchRelationships,
    isFinished: relationshipsLoaded,
    error: relationshipsError,
  } = useDataApi<ControlRelationship[]>(BASE_URL, null, { immediate: false });

  // Get single relationship
  const {
    data: relationship,
    execute: fetchRelationship,
    isFinished: relationshipLoaded,
    error: relationshipError,
  } = useDataApi<ControlRelationship>(BASE_URL, null, { immediate: false });

  // Create relationship
  const { data: createdRelationship, execute: executeCreate } =
    useDataApi<ControlRelationship>(
      BASE_URL,
      {
        method: 'POST',
        transformRequest: [decamelizeKeys],
      },
      { immediate: false },
    );

  // Delete relationship
  const { execute: executeDelete } = useDataApi<void>(
    BASE_URL,
    { method: 'DELETE' },
    { immediate: false },
  );

  /**
   * Fetch all control relationships with optional filters
   */
  async function listRelationships(params?: ControlRelationshipListParams) {
    const queryParams = new URLSearchParams();
    if (params?.workflowDefinitionId)
      queryParams.append('workflow_definition_id', params.workflowDefinitionId);
    if (params?.catalogId) queryParams.append('catalog_id', params.catalogId);
    if (params?.controlId) queryParams.append('control_id', params.controlId);

    const url = queryParams.toString()
      ? `${BASE_URL}?${queryParams}`
      : BASE_URL;
    await fetchRelationships(url);
    return relationships.value;
  }

  /**
   * Fetch a single control relationship by ID
   */
  async function getRelationship(id: string) {
    await fetchRelationship(`${BASE_URL}/${id}`);
    return relationship.value;
  }

  /**
   * Create a new control relationship (link workflow to control)
   */
  async function createRelationship(
    data: ControlRelationshipCreate,
    onSuccess?: (relationship: ControlRelationship) => void,
  ) {
    try {
      await executeCreate({ data });
      toast.add({
        severity: 'success',
        summary: 'Control Linked',
        detail: 'Control has been linked to the workflow definition',
        life: 3000,
      });
      if (createdRelationship.value && onSuccess) {
        onSuccess(createdRelationship.value);
      }
      return createdRelationship.value;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Linking Control',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to link control to workflow definition',
        life: 3000,
      });
      throw error;
    }
  }

  /**
   * Delete a control relationship (unlink control from workflow)
   */
  async function deleteRelationship(
    id: string,
    controlTitle?: string,
    onSuccess?: () => void,
  ) {
    return new Promise<void>((resolve, reject) => {
      confirm.require({
        message: controlTitle
          ? `Are you sure you want to unlink control "${controlTitle}" from this workflow definition?`
          : 'Are you sure you want to remove this control link?',
        header: 'Unlink Control',
        rejectProps: { label: 'Cancel', severity: 'secondary' },
        acceptProps: { label: 'Unlink', severity: 'danger' },
        accept: async () => {
          try {
            await executeDelete(`${BASE_URL}/${id}`);
            toast.add({
              severity: 'success',
              summary: 'Control Unlinked',
              detail: 'Control has been unlinked from the workflow definition',
              life: 3000,
            });
            onSuccess?.();
            resolve();
          } catch (error) {
            toast.add({
              severity: 'error',
              summary: 'Error Unlinking Control',
              detail:
                error instanceof Error
                  ? error.message
                  : 'Failed to unlink control from workflow definition',
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
   * Link multiple controls to a workflow definition
   */
  async function linkControls(
    workflowDefinitionId: string,
    controls: Array<{ catalogId: string; controlId: string }>,
    onSuccess?: () => void,
  ) {
    try {
      const promises = controls.map((control) =>
        executeCreate({
          data: {
            workflowDefinitionId,
            catalogId: control.catalogId,
            controlId: control.controlId,
          },
        }),
      );
      await Promise.all(promises);
      toast.add({
        severity: 'success',
        summary: 'Controls Linked',
        detail: `${controls.length} control(s) have been linked to the workflow definition`,
        life: 3000,
      });
      onSuccess?.();
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Linking Controls',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to link some controls to workflow definition',
        life: 3000,
      });
      throw error;
    }
  }

  return {
    // Reactive data
    relationships,
    relationship,
    relationshipsLoaded,
    relationshipLoaded,
    relationshipsError,
    relationshipError,
    createdRelationship,

    // Methods
    listRelationships,
    getRelationship,
    createRelationship,
    deleteRelationship,
    linkControls,

    // Raw execute functions for advanced use
    fetchRelationships,
    fetchRelationship,
  };
}
