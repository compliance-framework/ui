import { computed, type Ref } from 'vue';
import type { StepExecution, StepDefinition } from '@/types/workflows';

/**
 * Composable for managing step execution permissions and action availability.
 * Extracts permission logic to reduce complexity in components.
 */
export function useStepPermissions(
  step: Ref<StepExecution | null>,
  stepDefinition: Ref<StepDefinition | null | undefined>,
  userCanTransition: Ref<boolean>,
) {
  const canStart = computed(() => {
    return step.value?.status === 'pending' && userCanTransition.value;
  });

  const canComplete = computed(() => {
    return step.value?.status === 'in_progress' && userCanTransition.value;
  });

  const canFail = computed(() => {
    return step.value?.status === 'in_progress' && userCanTransition.value;
  });

  const canSubmitEvidence = computed(() => {
    return step.value?.status === 'in_progress';
  });

  const noActionMessageSeverity = computed(
    (): 'info' | 'warn' | 'secondary' => {
      if (!userCanTransition.value) return 'warn';
      if (step.value?.status === 'completed') return 'info';
      if (step.value?.status === 'blocked') return 'secondary';
      return 'info';
    },
  );

  const noActionMessageTitle = computed((): string => {
    if (!userCanTransition.value) return 'No Permission';
    if (step.value?.status === 'completed') return 'Step Completed';
    if (step.value?.status === 'blocked') return 'Step Blocked';
    if (step.value?.status === 'failed') return 'Step Failed';
    if (step.value?.status === 'skipped') return 'Step Skipped';
    return 'No Actions Available';
  });

  const noActionMessage = computed((): string => {
    if (!userCanTransition.value) {
      const role = stepDefinition.value?.responsibleRole;
      return `You don't have permission to transition this step. This step is assigned to the "${role}" role.`;
    }

    switch (step.value?.status) {
      case 'completed':
        return 'This step has already been completed. No further actions are needed.';
      case 'blocked':
        return 'This step is blocked by dependencies. Complete the required steps first.';
      case 'failed':
        return 'This step has failed. You can retry the workflow execution from the main view.';
      case 'skipped':
        return 'This step was skipped during execution.';
      default:
        return 'No actions are currently available for this step.';
    }
  });

  const showNoActionMessage = computed(() => {
    return (
      !canStart.value && !canComplete.value && !canFail.value && step.value
    );
  });

  return {
    canStart,
    canComplete,
    canFail,
    canSubmitEvidence,
    noActionMessageSeverity,
    noActionMessageTitle,
    noActionMessage,
    showNoActionMessage,
  };
}
