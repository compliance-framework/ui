<template>
  <div v-if="store.definition" class="space-y-6">
    <!-- Header with Add Button -->
    <div class="flex justify-between items-center">
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-slate-200">
          Step Definitions
        </h3>
        <p class="text-sm text-gray-500 dark:text-slate-400">
          Define the steps and their dependencies for this workflow
        </p>
      </div>
      <PrimaryButton @click="openCreateForm">
        <i class="pi pi-plus mr-2"></i>
        Add Step
      </PrimaryButton>
    </div>

    <!-- DAG Visualization -->
    <StepDAGVisualization
      :steps="store.steps"
      :selected-step-id="selectedStepId ?? undefined"
      @step-click="selectStep"
    />

    <!-- Steps List -->
    <div class="space-y-4">
      <div
        v-for="step in sortedSteps"
        :key="step.id"
        class="border rounded-lg p-4 cursor-pointer transition-colors"
        :class="{
          'border-blue-500 bg-blue-50 dark:bg-blue-900/20':
            selectedStepId === step.id,
          'border-ccf-300 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700':
            selectedStepId !== step.id,
        }"
        @click="selectStep(step.id)"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-400 dark:text-slate-500">
                #{{ step.order }}
              </span>
              <h4 class="font-medium text-gray-900 dark:text-slate-200">
                {{ step.name }}
              </h4>
            </div>
            <p
              v-if="step.description"
              class="text-sm text-gray-500 dark:text-slate-400 mt-1"
            >
              {{ step.description }}
            </p>
            <div class="flex flex-wrap gap-2 mt-2">
              <Badge v-if="step.responsibleRole" severity="info">
                {{ step.responsibleRole }}
              </Badge>
              <Badge v-if="requiresEvidence(step)" severity="warn">
                Evidence Required
              </Badge>
              <Badge
                v-if="step.dependsOn && step.dependsOn.length > 0"
                severity="secondary"
              >
                {{ step.dependsOn.length }} dependencies
              </Badge>
            </div>
          </div>
          <div class="flex gap-2">
            <SecondaryButton size="small" @click.stop="editStep(step)">
              Edit
            </SecondaryButton>
            <SecondaryButton
              size="small"
              severity="danger"
              @click.stop="handleDeleteStep(step)"
            >
              Delete
            </SecondaryButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="store.steps.length === 0"
      class="text-center py-12 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg"
    >
      <i class="pi pi-list text-4xl text-gray-300 dark:text-slate-600"></i>
      <p class="mt-4 text-gray-500 dark:text-slate-400">
        No steps defined yet.
      </p>
      <p class="text-sm text-gray-400 dark:text-slate-500 mt-2">
        Click "Add Step" to create your first workflow step.
      </p>
    </div>

    <!-- Step Form Drawer -->
    <Drawer
      v-model:visible="showForm"
      :header="editingStep ? 'Edit Step' : 'Add Step'"
      position="right"
      class="w-full! md:w-1/2! lg:w-3/5!"
    >
      <StepDefinitionForm
        :step="editingStep ?? undefined"
        :workflow-definition-id="store.definition.id"
        :available-steps="store.steps"
        @saved="handleStepSaved"
        @cancel="closeForm"
      />
    </Drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWorkflowDefinitionStore } from '@/stores/workflows/definitions';
import { useWorkflowStepDefinitions } from '@/composables/workflows';
import { hasEvidenceRequirement } from '@/utils/workflows';
import type { StepDefinition } from '@/types/workflows';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Badge from '@/volt/Badge.vue';
import Drawer from '@/volt/Drawer.vue';
import StepDAGVisualization from './partials/StepDAGVisualization.vue';
import StepDefinitionForm from './partials/StepDefinitionForm.vue';

const store = useWorkflowDefinitionStore();
const { deleteStep } = useWorkflowStepDefinitions();

const showForm = ref(false);
const editingStep = ref<StepDefinition | null>(null);
const selectedStepId = ref<string | null>(null);

const sortedSteps = computed(() => {
  return [...store.steps].sort((a, b) => a.order - b.order);
});

function openCreateForm() {
  editingStep.value = null;
  showForm.value = true;
}

function editStep(step: StepDefinition) {
  editingStep.value = step;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingStep.value = null;
}

function selectStep(stepId: string) {
  selectedStepId.value = selectedStepId.value === stepId ? null : stepId;
}

async function handleStepSaved(step: StepDefinition) {
  if (editingStep.value) {
    store.updateStepLocally(step);
  } else {
    store.addStepLocally(step);
  }
  closeForm();
}

async function handleDeleteStep(step: StepDefinition) {
  await deleteStep(step.id, step.name, () => {
    store.removeStepLocally(step.id);
    if (selectedStepId.value === step.id) {
      selectedStepId.value = null;
    }
  });
}

function requiresEvidence(step: StepDefinition): boolean {
  return hasEvidenceRequirement(step.evidenceRequired);
}
</script>
