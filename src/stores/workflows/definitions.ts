import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import type {
  WorkflowDefinition,
  WorkflowDefinitionUpdate,
  StepDefinition,
} from '@/types/workflows';

/**
 * Store for managing the currently edited workflow definition.
 * Used by the editor view and its child views to share state.
 */
export const useWorkflowDefinitionStore = defineStore(
  'workflow-definition',
  () => {
    // Current definition being edited
    const definition = ref<WorkflowDefinition | null>(null);
    const steps = ref<StepDefinition[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    // Computed
    const hasDefinition = computed(() => definition.value !== null);
    const definitionId = computed(() => definition.value?.id);

    // API helpers
    const { execute: fetchDefinitionApi } = useDataApi<WorkflowDefinition>(
      '/api/workflows/definitions',
      null,
      { immediate: false },
    );

    const { execute: updateDefinitionApi } = useDataApi<WorkflowDefinition>(
      '/api/workflows/definitions',
      {
        method: 'PUT',
        transformRequest: [decamelizeKeys],
      },
      { immediate: false },
    );

    const { execute: fetchStepsApi } = useDataApi<StepDefinition[]>(
      '/api/workflows/steps',
      null,
      { immediate: false },
    );

    /**
     * Load a workflow definition by ID
     */
    async function loadDefinition(id: string): Promise<void> {
      isLoading.value = true;
      error.value = null;

      try {
        const response = await fetchDefinitionApi(
          `/api/workflows/definitions/${id}`,
        );
        definition.value = response.data.value?.data ?? null;

        // Also load steps
        await loadSteps();
      } catch (e) {
        error.value =
          e instanceof Error ? e.message : 'Failed to load definition';
        definition.value = null;
      } finally {
        isLoading.value = false;
      }
    }

    /**
     * Load steps for the current definition
     */
    async function loadSteps(): Promise<void> {
      if (!definition.value) return;

      try {
        const response = await fetchStepsApi(
          `/api/workflows/steps?workflow_definition_id=${definition.value.id}`,
        );
        steps.value = response.data.value?.data ?? [];
      } catch (e) {
        console.error('Failed to load steps:', e);
        steps.value = [];
      }
    }

    /**
     * Update the current definition
     */
    async function updateDefinition(
      data: WorkflowDefinitionUpdate,
    ): Promise<WorkflowDefinition | null> {
      if (!definition.value) return null;

      try {
        const response = await updateDefinitionApi(
          `/api/workflows/definitions/${definition.value.id}`,
          { data },
        );
        const updated = response.data.value?.data;
        if (updated) {
          definition.value = updated;
        }
        return updated ?? null;
      } catch (e) {
        throw e;
      }
    }

    /**
     * Update a step in the local state
     */
    function updateStepLocally(step: StepDefinition): void {
      const idx = steps.value.findIndex((s) => s.id === step.id);
      if (idx >= 0) {
        steps.value[idx] = step;
      }
    }

    /**
     * Add a step to the local state
     */
    function addStepLocally(step: StepDefinition): void {
      steps.value.push(step);
    }

    /**
     * Remove a step from the local state
     */
    function removeStepLocally(stepId: string): void {
      steps.value = steps.value.filter((s) => s.id !== stepId);
    }

    /**
     * Clear the store state
     */
    function clear(): void {
      definition.value = null;
      steps.value = [];
      error.value = null;
      isLoading.value = false;
    }

    return {
      // State
      definition,
      steps,
      isLoading,
      error,

      // Computed
      hasDefinition,
      definitionId,

      // Actions
      loadDefinition,
      loadSteps,
      updateDefinition,
      updateStepLocally,
      addStepLocally,
      removeStepLocally,
      clear,
    };
  },
);
