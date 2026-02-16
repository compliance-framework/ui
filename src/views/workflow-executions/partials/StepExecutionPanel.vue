<template>
  <Drawer
    v-model:visible="isVisible"
    position="right"
    class="w-full! md:w-1/2! lg:w-3/5!"
    :header="stepName"
  >
    <template v-if="step">
      <!-- Status Badge -->
      <div class="mb-4">
        <Badge :severity="getStepStatusSeverity(step.status)" size="large">
          {{ formatStatus(step.status) }}
        </Badge>
      </div>

      <!-- Step Details -->
      <div class="space-y-4">
        <!-- Description -->
        <div
          v-if="stepDefinition?.description"
          class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
        >
          <h4 class="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
            Description
          </h4>
          <p class="text-sm text-blue-700 dark:text-blue-300">
            {{ stepDefinition.description }}
          </p>
        </div>

        <!-- Metadata -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-xs text-gray-500 dark:text-slate-400">
              Responsible Role
            </div>
            <div class="text-sm font-medium text-gray-900 dark:text-slate-200">
              {{ stepDefinition?.responsibleRole || 'Not assigned' }}
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-500 dark:text-slate-400">
              Estimated Duration
            </div>
            <div class="text-sm font-medium text-gray-900 dark:text-slate-200">
              {{ formatDuration(stepDefinition?.estimatedDurationMinutes) }}
            </div>
          </div>
        </div>

        <!-- Timestamps -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div v-if="step.startedAt">
            <div class="text-xs text-gray-500 dark:text-slate-400">Started</div>
            <div class="text-gray-900 dark:text-slate-200">
              {{ formatDate(step.startedAt) }}
            </div>
          </div>
          <div v-if="step.completedAt">
            <div class="text-xs text-gray-500 dark:text-slate-400">
              Completed
            </div>
            <div class="text-gray-900 dark:text-slate-200">
              {{ formatDate(step.completedAt) }}
            </div>
          </div>
        </div>

        <!-- Failure Reason -->
        <div
          v-if="step.failureReason"
          class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <h4 class="text-sm font-medium text-red-900 dark:text-red-200 mb-2">
            Failure Reason
          </h4>
          <p class="text-sm text-red-700 dark:text-red-300">
            {{ step.failureReason }}
          </p>
        </div>

        <!-- Completion Notes -->
        <div
          v-if="step.completionNotes"
          class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
        >
          <h4
            class="text-sm font-medium text-green-900 dark:text-green-200 mb-2"
          >
            Completion Notes
          </h4>
          <p class="text-sm text-green-700 dark:text-green-300">
            {{ step.completionNotes }}
          </p>
        </div>

        <!-- Evidence Requirements -->
        <div v-if="evidenceRequirements.length > 0" class="space-y-2">
          <h4 class="text-sm font-medium text-gray-900 dark:text-slate-200">
            Evidence Requirements
          </h4>
          <div class="space-y-1">
            <div
              v-for="(req, index) in evidenceRequirements"
              :key="req.type + '-' + index"
              class="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300"
            >
              <i class="pi pi-check-circle text-blue-600"></i>
              <span class="capitalize">{{ req.description || req.type }}</span>
              <span v-if="req.required" class="text-xs text-amber-600">*</span>
            </div>
          </div>
        </div>

        <!-- Submitted Evidence -->
        <div v-if="step.evidence && step.evidence.length > 0" class="space-y-2">
          <h4 class="text-sm font-medium text-gray-900 dark:text-slate-200">
            Submitted Evidence ({{ step.evidence.length }})
          </h4>
          <div class="space-y-2">
            <div
              v-for="evidence in step.evidence"
              :key="evidence.id"
              class="p-3 border border-ccf-300 dark:border-slate-700 rounded-lg"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <i class="pi pi-file text-blue-600"></i>
                  <div>
                    <div
                      class="text-sm font-medium text-gray-900 dark:text-slate-200 capitalize"
                    >
                      {{ evidence.evidenceType }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-slate-400">
                      Submitted: {{ formatDate(evidence.submittedAt) }}
                    </div>
                  </div>
                </div>
                <SecondaryButton
                  v-if="evidence.fileUrl"
                  size="small"
                  @click="downloadEvidence(evidence)"
                >
                  <i class="pi pi-download"></i>
                </SecondaryButton>
              </div>
              <div
                v-if="evidence.attestationText"
                class="mt-2 text-sm text-gray-600 dark:text-slate-400"
              >
                {{ evidence.attestationText }}
              </div>
            </div>
          </div>
        </div>

        <!-- Collected Evidence (not yet submitted) -->
        <div v-if="collectedEvidence.length > 0" class="space-y-2">
          <h4 class="text-sm font-medium text-gray-900 dark:text-slate-200">
            Collected Evidence ({{ collectedEvidence.length }})
            <Badge severity="info" size="small" class="ml-2"
              >Ready to submit</Badge
            >
          </h4>
          <div class="space-y-2">
            <div
              v-for="(evidence, index) in collectedEvidence"
              :key="index"
              class="p-3 border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <i class="pi pi-file-edit text-blue-600"></i>
                  <div>
                    <div
                      class="text-sm font-medium text-gray-900 dark:text-slate-200 capitalize"
                    >
                      {{ evidence.evidenceType }}
                    </div>
                    <div class="text-xs text-blue-600 dark:text-blue-400">
                      Will be submitted when step is completed
                    </div>
                  </div>
                </div>
                <SecondaryButton
                  size="small"
                  severity="danger"
                  @click="collectedEvidence.splice(index, 1)"
                >
                  <i class="pi pi-times"></i>
                </SecondaryButton>
              </div>
              <div
                v-if="evidence.attestationText"
                class="mt-2 text-sm text-gray-600 dark:text-slate-400"
              >
                {{ evidence.attestationText }}
              </div>
              <div
                v-if="evidence.file"
                class="mt-2 text-sm text-gray-600 dark:text-slate-400"
              >
                File: {{ evidence.file.name }}
              </div>
            </div>
          </div>
        </div>

        <!-- Evidence Submission Form -->
        <EvidenceSubmissionForm
          v-if="canSubmitEvidence"
          :step="step"
          :evidence-requirements="requiredEvidenceTypes"
          @evidence-submitted="handleEvidenceSubmitted"
        />

        <!-- Completion Notes Input -->
        <div v-if="step.status === 'in_progress'">
          <Label for="completionNotes">Completion Notes (Optional)</Label>
          <Textarea
            id="completionNotes"
            v-model="completionNotes"
            rows="3"
            placeholder="Add any notes about completing this step..."
            class="w-full"
          />
        </div>
      </div>

      <!-- Permission/Status Message -->
      <Message
        v-if="showNoActionMessage"
        :severity="noActionMessageSeverity"
        class="mt-4"
      >
        <div class="text-sm">
          <strong>{{ noActionMessageTitle }}</strong>
          <div class="mt-1">{{ noActionMessage }}</div>
        </div>
      </Message>

      <!-- Actions -->
      <div
        class="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700 flex gap-3"
      >
        <PrimaryButton
          v-if="canStart"
          @click="handleStart"
          :disabled="isProcessing"
          class="flex-1"
        >
          <i v-if="isProcessing" class="pi pi-spin pi-spinner mr-2"></i>
          <i v-else class="pi pi-play mr-2"></i>
          Start Step
        </PrimaryButton>

        <PrimaryButton
          v-if="canComplete"
          @click="handleComplete"
          :disabled="isProcessing || !hasRequiredEvidence"
          class="flex-1"
        >
          <i v-if="isProcessing" class="pi pi-spin pi-spinner mr-2"></i>
          <i v-else class="pi pi-check mr-2"></i>
          Complete Step
        </PrimaryButton>

        <SecondaryButton
          v-if="canFail"
          severity="danger"
          @click="openFailDialog"
          :disabled="isProcessing"
        >
          <i class="pi pi-times mr-2"></i>
          Mark Failed
        </SecondaryButton>

        <SecondaryButton
          v-if="canReassign"
          @click="openReassignDialog"
          :disabled="isProcessing"
        >
          <i class="pi pi-send mr-2"></i>
          Reassign Task
        </SecondaryButton>

        <SecondaryButton @click="close"> Close </SecondaryButton>
      </div>

      <!-- Evidence Validation Warning -->
      <Message
        v-if="canComplete && !hasRequiredEvidence"
        severity="warn"
        class="mt-4"
      >
        Please submit all required evidence before completing this step.
      </Message>
    </template>
  </Drawer>

  <!-- Fail Step Dialog -->
  <Dialog
    v-model:visible="showFailDialog"
    header="Mark Step as Failed"
    :draggable="false"
    modal
    class="w-full max-w-md"
  >
    <div class="space-y-4">
      <p class="text-sm text-gray-600 dark:text-slate-400">
        Please provide a reason for marking this step as failed. This may block
        dependent steps and could cause the workflow execution to fail.
      </p>
      <div>
        <Label for="failureReason" required>Failure Reason</Label>
        <Textarea
          id="failureReason"
          v-model="failureReason"
          rows="4"
          placeholder="Describe why this step failed..."
          class="w-full"
          autofocus
        />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-3">
        <SecondaryButton @click="showFailDialog = false">
          Cancel
        </SecondaryButton>
        <SecondaryButton
          severity="danger"
          @click="handleFail"
          :disabled="!failureReason.trim() || isProcessing"
        >
          <i v-if="isProcessing" class="pi pi-spin pi-spinner mr-2"></i>
          <i v-else class="pi pi-times mr-2"></i>
          Mark as Failed
        </SecondaryButton>
      </div>
    </template>
  </Dialog>

  <!-- Reassign Step Dialog -->
  <Dialog
    v-model:visible="showReassignDialog"
    header="Reassign Task"
    :draggable="false"
    modal
    class="w-full max-w-xl"
  >
    <form id="reassign-form" @submit.prevent="handleReassign" class="space-y-4">
      <p class="text-sm text-gray-600 dark:text-slate-400">
        Select a user to transfer this task to.
      </p>

      <div>
        <Label for="reassign-user" required>Assignee (Email)</Label>
        <AutoComplete
          id="reassign-user"
          v-model="selectedReassignUser"
          :suggestions="userSuggestions"
          optionLabel="displayName"
          placeholder="Search users by name or email..."
          class="w-full"
          aria-required="true"
          :forceSelection="true"
          :disabled="isProcessing"
          @complete="searchUsers"
        >
          <template #item="{ item }">
            <div class="flex flex-col">
              <span class="font-medium text-gray-900 dark:text-slate-100">
                {{ item.displayName }}
              </span>
              <span class="text-sm text-gray-500 dark:text-slate-400">
                {{ item.email }}
              </span>
            </div>
          </template>
          <template #selected="{ value }">
            <div class="flex flex-col">
              <span class="font-medium text-gray-900 dark:text-slate-100">
                {{ value?.displayName }}
              </span>
              <span class="text-sm text-gray-500 dark:text-slate-400">
                {{ value?.email }}
              </span>
            </div>
          </template>
        </AutoComplete>
      </div>

      <div>
        <Label for="reassign-reason">Reason (Optional)</Label>
        <Textarea
          id="reassign-reason"
          v-model="reassignReason"
          rows="3"
          placeholder="Add context for this reassignment..."
          class="w-full"
          :disabled="isProcessing"
        />
      </div>

      <Message v-if="reassignError" severity="error">
        {{ reassignError }}
      </Message>
    </form>
    <template #footer>
      <div class="flex justify-end gap-3">
        <SecondaryButton type="button" @click="closeReassignDialog">
          Cancel
        </SecondaryButton>
        <PrimaryButton
          form="reassign-form"
          type="submit"
          :disabled="isProcessing"
        >
          <i v-if="isProcessing" class="pi pi-spin pi-spinner mr-2"></i>
          <i v-else class="pi pi-send mr-2"></i>
          Reassign
        </PrimaryButton>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useStepExecutions, useUserSearch } from '@/composables/workflows';
import { type DisplayUser } from '@/composables/workflows/useUserSearch';
import { useStepPermissions } from '@/composables/workflows/useStepPermissions';
import type {
  StepExecution,
  StepExecutionEvidence,
  StepExecutionEvidenceSubmit,
  EvidenceType,
  EvidenceRequirement,
} from '@/types/workflows';
import { REASSIGNABLE_STEP_EXECUTION_STATUSES } from '@/types/workflows';
import Drawer from '@/volt/Drawer.vue';
import Dialog from '@/volt/Dialog.vue';
import Badge from '@/volt/Badge.vue';
import Label from '@/volt/Label.vue';
import Textarea from '@/volt/Textarea.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Message from '@/volt/Message.vue';
import AutoComplete from '@/volt/AutoComplete.vue';
import EvidenceSubmissionForm from './EvidenceSubmissionForm.vue';

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
const { userSuggestions, searchUsers } = useUserSearch();

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
const showReassignDialog = ref(false);
const selectedReassignUser = ref<DisplayUser | null>(null);
const reassignReason = ref('');
const reassignError = ref('');
const hasAutoOpenedReassign = ref(false);

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

function getStepStatusSeverity(
  status: string,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  const severities: Record<
    string,
    'success' | 'info' | 'warn' | 'danger' | 'secondary'
  > = {
    pending: 'secondary',
    blocked: 'warn',
    in_progress: 'info',
    completed: 'success',
    failed: 'danger',
    skipped: 'secondary',
  };
  return severities[status] || 'secondary';
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').toUpperCase();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

function formatDuration(minutes?: number): string {
  if (!minutes) return 'Not specified';
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
  selectedReassignUser.value = null;
  reassignReason.value = '';
  showReassignDialog.value = true;
}

function closeReassignDialog() {
  showReassignDialog.value = false;
  reassignError.value = '';
}

async function handleReassign() {
  if (!props.step) return;

  const selectedUser = selectedReassignUser.value;
  if (!selectedUser?.email) {
    reassignError.value = 'Please select a valid user with an email address.';
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
      assignedToType: 'email',
      assignedToId: selectedUser.email,
      reason: reassignReason.value.trim() || undefined,
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

// Reset state and check permissions when step changes
watch(
  () => props.step?.id,
  async (newId) => {
    completionNotes.value = '';
    collectedEvidence.value = [];
    userCanTransition.value = false;

    if (newId && props.step) {
      try {
        userCanTransition.value = await canTransition(newId);
      } catch {
        userCanTransition.value = false;
      }
    }
    hasAutoOpenedReassign.value = false;
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
