<template>
  <Drawer
    v-model:visible="isVisible"
    position="right"
    class="w-full md:w-[600px]"
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
              v-for="req in evidenceRequirements"
              :key="req"
              class="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300"
            >
              <i class="pi pi-check-circle text-blue-600"></i>
              <span class="capitalize">{{ req }}</span>
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

        <!-- Evidence Submission Form -->
        <EvidenceSubmissionForm
          v-if="canSubmitEvidence"
          :step="step"
          :evidence-requirements="evidenceRequirements"
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
          @click="handleFail"
          :disabled="isProcessing"
        >
          <i class="pi pi-times mr-2"></i>
          Mark Failed
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useStepExecutions } from '@/composables/workflows';
import type {
  StepExecution,
  StepExecutionEvidence,
  EvidenceType,
} from '@/types/workflows';
import Drawer from '@/volt/Drawer.vue';
import Badge from '@/volt/Badge.vue';
import Label from '@/volt/Label.vue';
import Textarea from '@/volt/Textarea.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Message from '@/volt/Message.vue';
import EvidenceSubmissionForm from './EvidenceSubmissionForm.vue';

const props = defineProps<{
  step: StepExecution | null;
  visible: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'step-updated': [];
}>();

const { startStep, completeStep, failStep } = useStepExecutions();

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

const isProcessing = ref(false);
const completionNotes = ref('');

const stepDefinition = computed(() => {
  return props.step?.workflowStepDefinition || props.step?.stepDefinition;
});

const stepName = computed(() => {
  return stepDefinition.value?.name || 'Step Details';
});

const evidenceRequirements = computed(() => {
  if (!stepDefinition.value?.evidenceRequired) return [];
  try {
    const parsed = JSON.parse(stepDefinition.value.evidenceRequired);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});

const hasRequiredEvidence = computed(() => {
  if (evidenceRequirements.value.length === 0) return true;
  if (!props.step?.evidence) return false;

  const submittedTypes = props.step.evidence.map((e) => e.evidenceType);
  return evidenceRequirements.value.every((req) =>
    submittedTypes.includes(req),
  );
});

const canStart = computed(() => {
  return props.step?.status === 'pending';
});

const canComplete = computed(() => {
  return props.step?.status === 'in_progress';
});

const canFail = computed(() => {
  return props.step?.status === 'in_progress';
});

const canSubmitEvidence = computed(() => {
  return props.step?.status === 'in_progress';
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
    // Update completion notes if provided
    if (completionNotes.value) {
      // TODO: Add API call to update completion notes
      // For now, we'll just pass it in the completion
    }

    await completeStep(props.step.id, () => {
      emit('step-updated');
      close();
    });
  } finally {
    isProcessing.value = false;
  }
}

async function handleFail() {
  if (!props.step) return;

  const reason = prompt(
    'Please provide a reason for marking this step as failed:',
  );
  if (!reason) return;

  isProcessing.value = true;
  try {
    await failStep(props.step.id, reason, () => {
      emit('step-updated');
      close();
    });
  } finally {
    isProcessing.value = false;
  }
}

function handleEvidenceSubmitted() {
  emit('step-updated');
}

function downloadEvidence(evidence: StepExecutionEvidence) {
  if (evidence.fileUrl) {
    window.open(evidence.fileUrl, '_blank');
  }
}

function close() {
  isVisible.value = false;
  completionNotes.value = '';
}

// Reset completion notes when step changes
watch(
  () => props.step?.id,
  () => {
    completionNotes.value = '';
  },
);
</script>
