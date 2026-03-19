import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type {
  WorkflowInstance,
  WorkflowInstanceUpdate,
  WorkflowExecution,
  RoleAssignment,
} from '@/types/workflows';

/**
 * Store for managing the currently edited workflow instance.
 * Used by the editor view and its child views to share state.
 */
export const useWorkflowInstanceStore = defineStore('workflow-instance', () => {
  // Current instance being edited
  const instance = ref<WorkflowInstance | null>(null);
  const executions = ref<WorkflowExecution[]>([]);
  const roleAssignments = ref<RoleAssignment[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const hasInstance = computed(() => instance.value !== null);
  const instanceId = computed(() => instance.value?.id);
  const isActive = computed(() => {
    // Check both the isActive field from backend and status field
    return (
      instance.value?.isActive === true || instance.value?.status === 'active'
    );
  });

  // API helpers
  const { execute: fetchInstanceApi } = useDataApi<WorkflowInstance>(
    '/api/workflows/instances',
    null,
    { immediate: false },
  );

  const { execute: updateInstanceApi } = useDataApi<WorkflowInstance>(
    '/api/workflows/instances',
    {
      method: 'PUT',
      transformRequest: [decamelizeKeys],
    },
    { immediate: false },
  );

  const { execute: fetchExecutionsApi } = useDataApi<WorkflowExecution[]>(
    '/api/workflows/executions',
    null,
    { immediate: false },
  );

  const { execute: fetchRoleAssignmentsApi } = useDataApi<RoleAssignment[]>(
    '/api/workflows/role-assignments',
    null,
    { immediate: false },
  );

  const { execute: activateApi } = useDataApi<WorkflowInstance>(
    '/api/workflows/instances',
    { method: 'PUT' },
    { immediate: false },
  );

  /**
   * Load a workflow instance by ID
   */
  async function loadInstance(id: string): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetchInstanceApi(`/api/workflows/instances/${id}`);
      instance.value = response.data.value?.data ?? null;

      // Also load related data
      await Promise.all([loadExecutions(), loadRoleAssignments()]);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load instance';
      instance.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Load executions for the current instance
   */
  async function loadExecutions(): Promise<void> {
    if (!instance.value) return;

    try {
      const response = await fetchExecutionsApi(
        `/api/workflows/executions?workflow_instance_id=${instance.value.id}`,
      );
      executions.value = response.data.value?.data ?? [];
    } catch (e) {
      console.error('Failed to load executions:', e);
      executions.value = [];
    }
  }

  /**
   * Load role assignments for the current instance
   */
  async function loadRoleAssignments(): Promise<void> {
    if (!instance.value) return;

    try {
      const response = await fetchRoleAssignmentsApi(
        `/api/workflows/role-assignments?workflow_instance_id=${instance.value.id}`,
      );
      roleAssignments.value = response.data.value?.data ?? [];
    } catch (e) {
      console.error('Failed to load role assignments:', e);
      roleAssignments.value = [];
    }
  }

  /**
   * Update the current instance
   */
  async function updateInstance(
    data: WorkflowInstanceUpdate,
  ): Promise<WorkflowInstance | null> {
    if (!instance.value) return null;

    try {
      const response = await updateInstanceApi(
        `/api/workflows/instances/${instance.value.id}`,
        { data },
      );
      const updated = response.data.value?.data;
      if (updated) {
        instance.value = updated;
      }
      return updated ?? null;
    } catch (e) {
      throw e;
    }
  }

  /**
   * Activate the current instance
   */
  async function activate(): Promise<void> {
    if (!instance.value) return;

    try {
      const response = await activateApi(
        `/api/workflows/instances/${instance.value.id}/activate`,
      );
      const updated = response.data.value?.data;
      if (updated) {
        instance.value = updated;
      }
    } catch (e) {
      throw e;
    }
  }

  /**
   * Deactivate the current instance
   */
  async function deactivate(): Promise<void> {
    if (!instance.value) return;

    try {
      const response = await activateApi(
        `/api/workflows/instances/${instance.value.id}/deactivate`,
      );
      const updated = response.data.value?.data;
      if (updated) {
        instance.value = updated;
      }
    } catch (e) {
      throw e;
    }
  }

  /**
   * Add an execution to the local state
   */
  function addExecutionLocally(execution: WorkflowExecution): void {
    executions.value.unshift(execution);
  }

  /**
   * Update a role assignment in the local state
   */
  function updateRoleAssignmentLocally(assignment: RoleAssignment): void {
    const idx = roleAssignments.value.findIndex((r) => r.id === assignment.id);
    if (idx >= 0) {
      roleAssignments.value[idx] = assignment;
    }
  }

  /**
   * Add a role assignment to the local state
   */
  function addRoleAssignmentLocally(assignment: RoleAssignment): void {
    roleAssignments.value.push(assignment);
  }

  /**
   * Remove a role assignment from the local state
   */
  function removeRoleAssignmentLocally(assignmentId: string): void {
    roleAssignments.value = roleAssignments.value.filter(
      (r) => r.id !== assignmentId,
    );
  }

  /**
   * Clear the store state
   */
  function clear(): void {
    instance.value = null;
    executions.value = [];
    roleAssignments.value = [];
    error.value = null;
    isLoading.value = false;
  }

  return {
    // State
    instance,
    executions,
    roleAssignments,
    isLoading,
    error,

    // Computed
    hasInstance,
    instanceId,
    isActive,

    // Actions
    loadInstance,
    loadExecutions,
    loadRoleAssignments,
    updateInstance,
    activate,
    deactivate,
    addExecutionLocally,
    updateRoleAssignmentLocally,
    addRoleAssignmentLocally,
    removeRoleAssignmentLocally,
    clear,
  };
});
