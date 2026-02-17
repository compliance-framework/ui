import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import type {
  WorkflowInstance,
  WorkflowInstanceCreate,
  WorkflowInstanceUpdate,
  WorkflowInstanceListParams,
  RoleAssignment,
  RoleAssignmentCreate,
  RoleAssignmentUpdate,
  RoleAssignmentListParams,
} from '@/types/workflows';

const BASE_URL = '/api/workflows/instances';
const ROLE_ASSIGNMENTS_URL = '/api/workflows/role-assignments';

function buildInstancePayload(
  data: WorkflowInstanceCreate | WorkflowInstanceUpdate,
) {
  const { gracePeriodDays, ...rest } = data;
  return {
    ...rest,
    ...(gracePeriodDays != null
      ? { 'grace-period-days': gracePeriodDays }
      : {}),
  };
}

/**
 * Composable for managing workflow instances.
 * Provides CRUD operations for workflow instances bound to systems/controls.
 */
export function useWorkflowInstances() {
  const toast = useToast();
  const confirm = useConfirm();

  // List workflow instances
  const {
    data: instances,
    execute: fetchInstances,
    isFinished: instancesLoaded,
    error: instancesError,
  } = useDataApi<WorkflowInstance[]>(BASE_URL, null, { immediate: false });

  // Get single instance
  const {
    data: instance,
    execute: fetchInstance,
    isFinished: instanceLoaded,
    error: instanceError,
  } = useDataApi<WorkflowInstance>(BASE_URL, null, { immediate: false });

  // Create instance
  const { data: createdInstance, execute: executeCreate } =
    useDataApi<WorkflowInstance>(
      BASE_URL,
      {
        method: 'POST',
        transformRequest: [decamelizeKeys],
      },
      { immediate: false },
    );

  // Update instance
  const { data: updatedInstance, execute: executeUpdate } =
    useDataApi<WorkflowInstance>(
      BASE_URL,
      {
        method: 'PUT',
        transformRequest: [decamelizeKeys],
      },
      { immediate: false },
    );

  // Delete instance
  const { execute: executeDelete } = useDataApi<void>(
    BASE_URL,
    { method: 'DELETE' },
    { immediate: false },
  );

  // Activate/Deactivate
  const { execute: executeActivate } = useDataApi<WorkflowInstance>(
    BASE_URL,
    { method: 'PUT' },
    { immediate: false },
  );

  // Role assignments
  const {
    data: roleAssignments,
    execute: fetchRoleAssignments,
    isFinished: roleAssignmentsLoaded,
  } = useDataApi<RoleAssignment[]>(ROLE_ASSIGNMENTS_URL, null, {
    immediate: false,
  });

  const { data: createdRoleAssignment, execute: executeCreateRoleAssignment } =
    useDataApi<RoleAssignment>(
      ROLE_ASSIGNMENTS_URL,
      {
        method: 'POST',
        transformRequest: [decamelizeKeys],
      },
      { immediate: false },
    );

  const { execute: executeUpdateRoleAssignment } = useDataApi<RoleAssignment>(
    ROLE_ASSIGNMENTS_URL,
    {
      method: 'PUT',
      transformRequest: [decamelizeKeys],
    },
    { immediate: false },
  );

  const { execute: executeDeleteRoleAssignment } = useDataApi<void>(
    ROLE_ASSIGNMENTS_URL,
    { method: 'DELETE' },
    { immediate: false },
  );

  /**
   * Fetch all workflow instances with optional filters
   */
  async function listInstances(params?: WorkflowInstanceListParams) {
    const queryParams = new URLSearchParams();
    if (params?.workflowDefinitionId)
      queryParams.append('workflow_definition_id', params.workflowDefinitionId);
    if (params?.systemId) queryParams.append('system_id', params.systemId);
    if (params?.controlId) queryParams.append('control_id', params.controlId);
    if (params?.status) queryParams.append('status', params.status);

    const url = queryParams.toString()
      ? `${BASE_URL}?${queryParams}`
      : BASE_URL;
    await fetchInstances(url);
    return instances.value;
  }

  /**
   * Fetch a single workflow instance by ID
   */
  async function getInstance(id: string) {
    await fetchInstance(`${BASE_URL}/${id}`);
    return instance.value;
  }

  /**
   * Create a new workflow instance
   */
  async function createInstance(
    data: WorkflowInstanceCreate,
    onSuccess?: (instance: WorkflowInstance) => void,
  ) {
    try {
      await executeCreate({ data: buildInstancePayload(data) });
      toast.add({
        severity: 'success',
        summary: 'Instance Created',
        detail: 'Workflow instance has been created successfully',
        life: 3000,
      });
      if (createdInstance.value && onSuccess) {
        onSuccess(createdInstance.value);
      }
      return createdInstance.value;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Creating Instance',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to create workflow instance',
        life: 3000,
      });
      throw error;
    }
  }

  /**
   * Update an existing workflow instance
   */
  async function updateInstance(
    id: string,
    data: WorkflowInstanceUpdate,
    onSuccess?: (instance: WorkflowInstance) => void,
  ) {
    try {
      await executeUpdate(`${BASE_URL}/${id}`, {
        data: buildInstancePayload(data),
      });
      toast.add({
        severity: 'success',
        summary: 'Instance Updated',
        detail: 'Workflow instance has been updated successfully',
        life: 3000,
      });
      if (updatedInstance.value && onSuccess) {
        onSuccess(updatedInstance.value);
      }
      return updatedInstance.value;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Updating Instance',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to update workflow instance',
        life: 3000,
      });
      throw error;
    }
  }

  /**
   * Delete a workflow instance with confirmation
   */
  async function deleteInstance(
    id: string,
    name: string,
    onSuccess?: () => void,
  ) {
    return new Promise<void>((resolve, reject) => {
      confirm.require({
        message: `Are you sure you want to delete the workflow instance "${name}"? This will also delete all associated executions.`,
        header: 'Delete Workflow Instance',
        rejectProps: { label: 'Cancel', severity: 'secondary' },
        acceptProps: { label: 'Delete', severity: 'danger' },
        accept: async () => {
          try {
            await executeDelete(`${BASE_URL}/${id}`);
            toast.add({
              severity: 'success',
              summary: 'Instance Deleted',
              detail: 'Workflow instance has been deleted successfully',
              life: 3000,
            });
            onSuccess?.();
            resolve();
          } catch (error) {
            toast.add({
              severity: 'error',
              summary: 'Error Deleting Instance',
              detail:
                error instanceof Error
                  ? error.message
                  : 'Failed to delete workflow instance',
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
   * Activate a workflow instance
   */
  async function activateInstance(id: string) {
    try {
      await executeActivate(`${BASE_URL}/${id}/activate`);
      toast.add({
        severity: 'success',
        summary: 'Instance Activated',
        detail: 'Workflow instance has been activated',
        life: 3000,
      });
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Activating Instance',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to activate workflow instance',
        life: 3000,
      });
      throw error;
    }
  }

  /**
   * Deactivate a workflow instance
   */
  async function deactivateInstance(id: string) {
    try {
      await executeActivate(`${BASE_URL}/${id}/deactivate`);
      toast.add({
        severity: 'success',
        summary: 'Instance Deactivated',
        detail: 'Workflow instance has been deactivated',
        life: 3000,
      });
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Deactivating Instance',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to deactivate workflow instance',
        life: 3000,
      });
      throw error;
    }
  }

  // ============================================================================
  // Role Assignment Methods
  // ============================================================================

  /**
   * Fetch role assignments for an instance
   */
  async function listRoleAssignments(params?: RoleAssignmentListParams) {
    const queryParams = new URLSearchParams();
    if (params?.workflowInstanceId)
      queryParams.append('workflow_instance_id', params.workflowInstanceId);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.userId) queryParams.append('user_id', params.userId);

    const url = queryParams.toString()
      ? `${ROLE_ASSIGNMENTS_URL}?${queryParams}`
      : ROLE_ASSIGNMENTS_URL;
    await fetchRoleAssignments(url);
    return roleAssignments.value;
  }

  /**
   * Create a role assignment
   */
  async function createRoleAssignment(
    data: RoleAssignmentCreate,
    onSuccess?: (assignment: RoleAssignment) => void,
  ) {
    try {
      await executeCreateRoleAssignment({ data });
      toast.add({
        severity: 'success',
        summary: 'Role Assigned',
        detail: 'User has been assigned to the role',
        life: 3000,
      });
      if (createdRoleAssignment.value && onSuccess) {
        onSuccess(createdRoleAssignment.value);
      }
      return createdRoleAssignment.value;
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Assigning Role',
        detail:
          error instanceof Error ? error.message : 'Failed to assign role',
        life: 3000,
      });
      throw error;
    }
  }

  /**
   * Update a role assignment
   */
  async function updateRoleAssignment(id: string, data: RoleAssignmentUpdate) {
    try {
      await executeUpdateRoleAssignment(`${ROLE_ASSIGNMENTS_URL}/${id}`, {
        data,
      });
      toast.add({
        severity: 'success',
        summary: 'Role Assignment Updated',
        detail: 'Role assignment has been updated',
        life: 3000,
      });
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Updating Role Assignment',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to update role assignment',
        life: 3000,
      });
      throw error;
    }
  }

  /**
   * Delete a role assignment
   */
  async function deleteRoleAssignment(id: string) {
    try {
      await executeDeleteRoleAssignment(`${ROLE_ASSIGNMENTS_URL}/${id}`);
      toast.add({
        severity: 'success',
        summary: 'Role Assignment Removed',
        detail: 'Role assignment has been removed',
        life: 3000,
      });
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Error Removing Role Assignment',
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to remove role assignment',
        life: 3000,
      });
      throw error;
    }
  }

  return {
    // Reactive data
    instances,
    instance,
    instancesLoaded,
    instanceLoaded,
    instancesError,
    instanceError,
    createdInstance,
    updatedInstance,
    roleAssignments,
    roleAssignmentsLoaded,

    // Instance methods
    listInstances,
    getInstance,
    createInstance,
    updateInstance,
    deleteInstance,
    activateInstance,
    deactivateInstance,

    // Role assignment methods
    listRoleAssignments,
    createRoleAssignment,
    updateRoleAssignment,
    deleteRoleAssignment,

    // Raw execute functions for advanced use
    fetchInstances,
    fetchInstance,
    fetchRoleAssignments,
  };
}
