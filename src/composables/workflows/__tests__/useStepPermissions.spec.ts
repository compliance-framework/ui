import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useStepPermissions } from '../useStepPermissions';
import type { StepExecution, StepDefinition } from '@/types/workflows';

// Helper to create test step definition
const createStepDef = (
  overrides: Partial<StepDefinition> = {},
): StepDefinition =>
  ({
    id: 'def-1',
    name: 'Test Step',
    workflowDefinitionId: 'workflow-1',
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    evidenceRequired: [],
    ...overrides,
  }) as StepDefinition;

// Helper to create evidence requirement
const createEvidenceReq = (type: string = 'document'): any => ({
  type,
  required: true,
  description: 'Test evidence',
});

describe('useStepPermissions', () => {
  describe('canStart', () => {
    it('returns true when step is pending and user can transition', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'pending',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(createStepDef());
      const userCanTransition = ref(true);

      const { canStart } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(canStart.value).toBe(true);
    });

    it('returns false when step is not pending', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'in_progress',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(createStepDef());
      const userCanTransition = ref(true);

      const { canStart } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(canStart.value).toBe(false);
    });

    it('returns false when user cannot transition', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'pending',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(createStepDef());
      const userCanTransition = ref(false);

      const { canStart } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(canStart.value).toBe(false);
    });

    it('returns false when step is null', () => {
      const step = ref<StepExecution | null>(null);
      const stepDefinition = ref<StepDefinition | null>(createStepDef());
      const userCanTransition = ref(true);

      const { canStart } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(canStart.value).toBe(false);
    });
  });

  describe('canComplete', () => {
    it('returns true when step is in_progress, has evidence, and user can transition', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'in_progress',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(
        createStepDef({ evidenceRequired: [createEvidenceReq()] }),
      );
      const userCanTransition = ref(true);

      const { canComplete } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(canComplete.value).toBe(true);
    });

    it('returns true when step is in_progress, no evidence required, and user can transition', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'in_progress',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(
        createStepDef({ evidenceRequired: [] }),
      );
      const userCanTransition = ref(true);

      const { canComplete } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(canComplete.value).toBe(true);
    });

    it('returns false when step is not in_progress', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'pending',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(createStepDef());
      const userCanTransition = ref(true);

      const { canComplete } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(canComplete.value).toBe(false);
    });

    it('returns false when user cannot transition', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'in_progress',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(createStepDef());
      const userCanTransition = ref(false);

      const { canComplete } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(canComplete.value).toBe(false);
    });
  });

  describe('canFail', () => {
    it('returns true when step is in_progress and user can transition', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'in_progress',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(createStepDef());
      const userCanTransition = ref(true);

      const { canFail } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(canFail.value).toBe(true);
    });

    it('returns false when step is not in_progress', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'completed',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(createStepDef());
      const userCanTransition = ref(true);

      const { canFail } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(canFail.value).toBe(false);
    });
  });

  describe('canSubmitEvidence', () => {
    it('returns true when step is in_progress and evidence is required', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'in_progress',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(
        createStepDef({ evidenceRequired: [createEvidenceReq()] }),
      );
      const userCanTransition = ref(true);

      const { canSubmitEvidence } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(canSubmitEvidence.value).toBe(true);
    });

    it('returns true even when no evidence is required (status-based only)', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'in_progress',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(
        createStepDef({ evidenceRequired: [] }),
      );
      const userCanTransition = ref(true);

      const { canSubmitEvidence } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      // canSubmitEvidence only checks status, not evidenceRequired
      expect(canSubmitEvidence.value).toBe(true);
    });

    it('returns false when step is not in_progress', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'pending',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(
        createStepDef({ evidenceRequired: [createEvidenceReq()] }),
      );
      const userCanTransition = ref(true);

      const { canSubmitEvidence } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(canSubmitEvidence.value).toBe(false);
    });
  });

  describe('noActionMessage', () => {
    it('shows blocked message when step is blocked', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'blocked',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(createStepDef());
      const userCanTransition = ref(true);

      const { showNoActionMessage, noActionMessage, noActionMessageSeverity } =
        useStepPermissions(step, stepDefinition, userCanTransition);

      expect(showNoActionMessage.value).toBeTruthy();
      expect(noActionMessage.value).toContain('blocked');
      expect(noActionMessageSeverity.value).toBe('secondary');
    });

    it('shows permission message when user cannot transition', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'pending',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(
        createStepDef({ responsibleRole: 'admin' }),
      );
      const userCanTransition = ref(false);

      const { showNoActionMessage, noActionMessage, noActionMessageSeverity } =
        useStepPermissions(step, stepDefinition, userCanTransition);

      expect(showNoActionMessage.value).toBeTruthy();
      expect(noActionMessage.value).toContain('permission');
      expect(noActionMessageSeverity.value).toBe('warn');
    });

    it('shows completed message when step is completed', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'completed',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(createStepDef());
      const userCanTransition = ref(true);

      const { showNoActionMessage, noActionMessage } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(showNoActionMessage.value).toBeTruthy();
      expect(noActionMessage.value).toContain('completed');
    });

    it('hides message when actions are available', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'pending',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(createStepDef());
      const userCanTransition = ref(true);

      const { showNoActionMessage } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(showNoActionMessage.value).toBe(false);
    });
  });

  describe('reactivity', () => {
    it('updates permissions when step status changes', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'pending',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(createStepDef());
      const userCanTransition = ref(true);

      const { canStart, canComplete } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(canStart.value).toBe(true);
      expect(canComplete.value).toBe(false);

      step.value.status = 'in_progress';

      expect(canStart.value).toBe(false);
      expect(canComplete.value).toBe(true);
    });

    it('updates permissions when userCanTransition changes', () => {
      const step = ref<StepExecution>({
        id: '123',
        status: 'pending',
        workflowExecutionId: 'exec-1',
        workflowStepDefinitionId: 'def-1',
      } as StepExecution);
      const stepDefinition = ref<StepDefinition | null>(createStepDef());
      const userCanTransition = ref(true);

      const { canStart } = useStepPermissions(
        step,
        stepDefinition,
        userCanTransition,
      );

      expect(canStart.value).toBe(true);

      userCanTransition.value = false;

      expect(canStart.value).toBe(false);
    });
  });
});
