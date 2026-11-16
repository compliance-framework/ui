<script setup lang="ts">
/**
 * One step of a workflow run, in a drawer (the run page and My tasks): its status and dates, the
 * step's description, failure or completion notes, the evidence it asks for, evidence already
 * submitted and evidence collected to submit on completion, with Start, Complete, Mark failed and
 * Reassign as the user's access and the step's state allow.
 */
import { ref, computed, watch } from 'vue';
import { useStepExecutions } from '@/composables/workflows';
import { useStepPermissions } from '@/composables/workflows/useStepPermissions';
import type {
  StepExecution,
  StepExecutionEvidence,
  StepExecutionEvidenceSubmit,
  EvidenceType,
  EvidenceRequirement,
} from '@/types/workflows';
import { REASSIGNABLE_STEP_EXECUTION_STATUSES } from '@/types/workflows';
import { formatDateTime } from '@/ds/format';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import IconButton from '@/ds/components/IconButton/IconButton.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import type { MessageTone } from '@/ds/components/InlineMessage/tone';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import type { StatusKey } from '@/ds/components/StatusBadge/statuses';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import EvidenceSubmissionForm from './EvidenceSubmissionForm.vue';
import StepReassignForm from './StepReassignForm.vue';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can, permissionTooltip } = usePermissions();

const props = defineProps<{
  step: StepExecution | null;
  visible: boolean;
  openReassignOnOpen?: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'step-updated': [];
}>();

const {
  startStep,
  completeStep,
  failStep,
  canTransition,
  reassignStepExecution,
} = useStepExecutions();

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const isProcessing = ref(false);
const completionNotes = ref('');
const collectedEvidence = ref<StepExecutionEvidenceSubmit[]>([]);
const userCanTransition = ref(false);
const showFailDialog = ref(false);
const failureReason = ref('');
const failOpen = computed({
  get: () => showFailDialog.value,
  set: (open: boolean) => (showFailDialog.value = open),
});
const reassignOpen = computed({
  get: () => showReassignDialog.value,
  set: (open: boolean) => (open ? undefined : closeReassignDialog()),
});
const showReassignDialog = ref(false);
const reassignError = ref('');
const hasAutoOpenedReassign = ref(false);
let latestPermissionRequestId = 0;

const stepDefinition = computed(() => {
  return props.step?.workflowStepDefinition || props.step?.stepDefinition;
});

const stepName = computed(() => {
  return stepDefinition.value?.name ?? 'Step Details';
});

const evidenceRequirements = computed<EvidenceRequirement[]>(() => {
  const requirements = stepDefinition.value?.evidenceRequired;
  if (!requirements || !Array.isArray(requirements)) return [];
  return requirements;
});

const requiredEvidenceTypes = computed<EvidenceType[]>(() => {
  return evidenceRequirements.value
    .filter((req) => req.required)
    .map((req) => req.type);
});

const hasRequiredEvidence = computed(() => {
  if (requiredEvidenceTypes.value.length === 0) return true;

  const submittedTypes = props.step?.evidence?.map((e) => e.evidenceType) || [];
  const collectedTypes = collectedEvidence.value.map((e) => e.evidenceType);
  const allTypes = [...submittedTypes, ...collectedTypes];

  return requiredEvidenceTypes.value.every((type) => allTypes.includes(type));
});

const stepRef = computed(() => props.step);
const {
  canStart,
  canComplete,
  canFail,
  canSubmitEvidence,
  noActionMessageSeverity,
  noActionMessageTitle,
  noActionMessage,
  showNoActionMessage,
} = useStepPermissions(stepRef, stepDefinition, userCanTransition);

const canReassign = computed(() => {
  return (
    !!props.step &&
    userCanTransition.value &&
    REASSIGNABLE_STEP_EXECUTION_STATUSES.includes(props.step.status)
  );
});

const stepStatus = computed(
  () => `step-${props.step?.status.replace(/_/g, '-')}` as StatusKey,
);

const facts = computed(() => {
  const step = props.step;
  if (!step) return [];
  const when = (value?: string) => (value ? formatDateTime(value) : undefined);
  return [
    {
      key: 'role',
      label: 'Responsible role',
      value: stepDefinition.value?.responsibleRole || 'Not assigned',
    },
    { key: 'due', label: 'Due', value: when(step.dueDate) },
    { key: 'overdue', label: 'Overdue since', value: when(step.overdueAt) },
    { key: 'started', label: 'Started', value: when(step.startedAt) },
    { key: 'completed', label: 'Completed', value: when(step.completedAt) },
  ].filter((fact) => fact.value);
});

const NO_ACTION_TONES: Record<string, MessageTone> = {
  warn: 'warning',
  info: 'info',
  secondary: 'info',
};
const noActionTone = computed(
  () => NO_ACTION_TONES[noActionMessageSeverity.value] ?? 'info',
);

const updateDenied = computed(() =>
  can(RESOURCES.STEP_EXECUTION, ACTIONS.UPDATE)
    ? undefined
    : permissionTooltip(RESOURCES.STEP_EXECUTION, ACTIONS.UPDATE) ||
      "Your access doesn't include working on steps.",
);
const completeDenied = computed(
  () =>
    updateDenied.value ??
    (hasRequiredEvidence.value
      ? undefined
      : 'Add the required evidence first.'),
);

function evidenceLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

async function handleStart() {
  if (!props.step) return;

  isProcessing.value = true;
  try {
    await startStep(props.step.id, () => {
      emit('step-updated');
    });
  } finally {
    isProcessing.value = false;
  }
}

async function handleComplete() {
  if (!props.step) return;

  isProcessing.value = true;
  try {
    // Complete step with collected evidence and notes
    await completeStep(
      props.step.id,
      collectedEvidence.value.length > 0 ? collectedEvidence.value : undefined,
      completionNotes.value || undefined,
      () => {
        emit('step-updated');
        close();
      },
    );
  } finally {
    isProcessing.value = false;
  }
}

function openFailDialog() {
  failureReason.value = '';
  showFailDialog.value = true;
}

async function handleFail() {
  if (!props.step || !failureReason.value.trim()) return;

  isProcessing.value = true;
  try {
    await failStep(props.step.id, failureReason.value, () => {
      emit('step-updated');
      close();
    });
    showFailDialog.value = false;
  } finally {
    isProcessing.value = false;
  }
}

function openReassignDialog() {
  reassignError.value = '';
  showReassignDialog.value = true;
}

function closeReassignDialog() {
  showReassignDialog.value = false;
  reassignError.value = '';
}

async function handleReassign({
  userId,
  reason,
}: {
  userId: string;
  reason: string;
}) {
  if (!props.step) return;

  if (!userId) {
    reassignError.value = 'Choose who to assign it to.';
    return;
  }

  if (!canReassign.value) {
    reassignError.value =
      'This step cannot be reassigned in its current state.';
    return;
  }

  isProcessing.value = true;
  reassignError.value = '';

  try {
    await reassignStepExecution(props.step.id, {
      assignedToType: 'user',
      assignedToId: userId,
      reason: reason.trim() || undefined,
    });
    emit('step-updated');
    closeReassignDialog();
    close();
  } catch (error) {
    reassignError.value =
      error instanceof Error ? error.message : 'Failed to reassign step.';
  } finally {
    isProcessing.value = false;
  }
}

function handleEvidenceSubmitted(evidence: StepExecutionEvidenceSubmit) {
  // Collect evidence locally instead of submitting immediately
  collectedEvidence.value.push(evidence);
}

function downloadEvidence(evidence: StepExecutionEvidence) {
  if (evidence.fileUrl) {
    window.open(evidence.fileUrl, '_blank');
  }
}

function close() {
  isVisible.value = false;
  completionNotes.value = '';
  collectedEvidence.value = [];
  hasAutoOpenedReassign.value = false;
  closeReassignDialog();
}

async function refreshTransitionPermission(stepId?: string) {
  const requestId = ++latestPermissionRequestId;

  if (!stepId) {
    if (requestId === latestPermissionRequestId && !props.step?.id) {
      userCanTransition.value = false;
    }
    return;
  }

  try {
    const canTransitionResult = await canTransition(stepId);
    if (requestId === latestPermissionRequestId && stepId === props.step?.id) {
      userCanTransition.value = canTransitionResult;
    }
  } catch {
    if (requestId === latestPermissionRequestId && stepId === props.step?.id) {
      userCanTransition.value = false;
    }
  }
}

// Reset state and check permissions when step changes
watch(
  () => props.step?.id,
  () => {
    completionNotes.value = '';
    collectedEvidence.value = [];
    userCanTransition.value = false;
    hasAutoOpenedReassign.value = false;
  },
  { immediate: true },
);

watch(
  [() => props.visible, () => props.step?.id],
  ([visible, stepId]) => {
    if (visible) {
      refreshTransitionPermission(stepId);
    }
  },
  { immediate: true },
);

watch(
  [() => props.visible, () => props.openReassignOnOpen, canReassign],
  ([visible, openReassignOnOpen, isReassignable]) => {
    if (!visible) {
      hasAutoOpenedReassign.value = false;
      closeReassignDialog();
      return;
    }

    if (
      openReassignOnOpen &&
      isReassignable &&
      !showReassignDialog.value &&
      !hasAutoOpenedReassign.value
    ) {
      openReassignDialog();
      hasAutoOpenedReassign.value = true;
    }
  },
  { immediate: true },
);
</script>

<template>
  <Drawer v-model:open="isVisible" :title="stepName">
    <Stack v-if="step" gap="5">
      <Cluster gap="2">
        <StatusBadge :status="stepStatus" />
        <StatusBadge
          v-if="step.overdueAt"
          status="step-overdue"
          :label="`Overdue since ${formatDateTime(step.overdueAt)}`"
        />
      </Cluster>

      <Text v-if="stepDefinition?.description" variant="prose">{{
        stepDefinition.description
      }}</Text>

      <DescriptionList :items="facts" />

      <InlineMessage
        v-if="step.failureReason"
        tone="error"
        title="Why it failed"
      >
        <p>{{ step.failureReason }}</p>
      </InlineMessage>
      <InlineMessage
        v-if="step.completionNotes"
        tone="success"
        title="Completion notes"
      >
        <p>{{ step.completionNotes }}</p>
      </InlineMessage>

      <Stack v-if="evidenceRequirements.length" gap="2">
        <Text as="span" variant="label">Evidence it asks for</Text>
        <Stack as="ul" gap="1">
          <li
            v-for="(req, index) in evidenceRequirements"
            :key="req.type + '-' + index"
          >
            <Text
              >{{ req.description || evidenceLabel(req.type)
              }}{{ req.required ? ' (required)' : '' }}</Text
            >
          </li>
        </Stack>
      </Stack>

      <Stack v-if="step.evidence?.length" gap="2">
        <Text as="span" variant="label"
          >Submitted evidence ({{ step.evidence.length }})</Text
        >
        <Stack as="ul" gap="3">
          <li v-for="evidence in step.evidence" :key="evidence.id">
            <Cluster justify="between" align="start" gap="2">
              <Stack gap="1">
                <Text as="span">{{
                  evidenceLabel(evidence.evidenceType)
                }}</Text>
                <Text variant="caption"
                  >Submitted {{ formatDateTime(evidence.submittedAt) }}</Text
                >
                <Text v-if="evidence.attestationText" variant="secondary">{{
                  evidence.attestationText
                }}</Text>
              </Stack>
              <Button
                v-if="evidence.fileUrl"
                size="sm"
                icon="download"
                @click="downloadEvidence(evidence)"
                >Download</Button
              >
            </Cluster>
          </li>
        </Stack>
      </Stack>

      <Stack v-if="collectedEvidence.length" gap="2">
        <Text as="span" variant="label"
          >Ready to submit ({{ collectedEvidence.length }})</Text
        >
        <Text variant="caption"
          >Submitted with the step when you complete it.</Text
        >
        <Stack as="ul" gap="3">
          <li v-for="(evidence, index) in collectedEvidence" :key="index">
            <Cluster justify="between" align="start" gap="2">
              <Stack gap="1">
                <Text as="span">{{
                  evidenceLabel(evidence.evidenceType)
                }}</Text>
                <Text v-if="evidence.attestationText" variant="secondary">{{
                  evidence.attestationText
                }}</Text>
                <Text v-if="evidence.linkUrl" variant="secondary">{{
                  evidence.linkUrl
                }}</Text>
                <Text v-if="evidence.file" variant="secondary"
                  >File: {{ evidence.file.name }}</Text
                >
              </Stack>
              <IconButton
                icon="close"
                :label="`Remove ${evidenceLabel(evidence.evidenceType)} evidence`"
                @click="collectedEvidence.splice(index, 1)"
              />
            </Cluster>
          </li>
        </Stack>
      </Stack>

      <EvidenceSubmissionForm
        v-if="canSubmitEvidence"
        :step="step"
        :evidence-requirements="evidenceRequirements"
        @evidence-submitted="handleEvidenceSubmitted"
      />

      <FormField
        v-if="step.status === 'in_progress' || step.status === 'overdue'"
        label="Completion notes"
        hint="Optional."
      >
        <Textarea v-model="completionNotes" :rows="3" />
      </FormField>

      <InlineMessage
        v-if="showNoActionMessage"
        :tone="noActionTone"
        :title="noActionMessageTitle"
      >
        <p>{{ noActionMessage }}</p>
      </InlineMessage>
      <InlineMessage
        v-if="canComplete && !hasRequiredEvidence"
        tone="warning"
        title="Add the required evidence before completing this step."
      />
    </Stack>

    <template v-if="step" #footer>
      <Cluster gap="2">
        <Button
          v-if="canStart"
          variant="primary"
          icon="next"
          :loading="isProcessing"
          :disabled-reason="updateDenied"
          @click="handleStart"
          >Start step</Button
        >
        <Button
          v-if="canComplete"
          variant="primary"
          icon="check"
          :loading="isProcessing"
          :disabled-reason="completeDenied"
          @click="handleComplete"
          >Complete step</Button
        >
        <Button
          v-if="canFail"
          variant="danger"
          icon="close"
          :disabled-reason="updateDenied"
          @click="openFailDialog"
          >Mark failed</Button
        >
        <Button
          v-if="canReassign"
          icon="person"
          :disabled-reason="updateDenied"
          @click="openReassignDialog"
          >Reassign task</Button
        >
        <Button @click="close">Close</Button>
      </Cluster>
    </template>
  </Drawer>

  <ConfirmDialog
    v-model:open="failOpen"
    title="Mark this step as failed?"
    confirm-label="Mark as failed"
    :confirm-disabled-reason="
      updateDenied ??
      (failureReason.trim() ? undefined : 'Say why the step failed.')
    "
    @confirm="handleFail"
  >
    <Stack gap="3">
      <Text
        >This may block the steps that depend on it and could fail the
        run.</Text
      >
      <FormField label="Why it failed" required>
        <Textarea v-model="failureReason" :rows="4" />
      </FormField>
    </Stack>
  </ConfirmDialog>

  <Dialog
    v-model:open="reassignOpen"
    title="Reassign this task"
    description="Transfer it to someone else."
  >
    <StepReassignForm
      v-if="reassignOpen"
      :error="reassignError"
      :processing="isProcessing"
      @submit="handleReassign"
      @cancel="closeReassignDialog"
    />
  </Dialog>
</template>
