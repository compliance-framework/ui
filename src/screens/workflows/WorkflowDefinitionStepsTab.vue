<script setup lang="ts">
/**
 * A workflow definition's Steps tab: the step graph, then every step in order with its role,
 * evidence and dependencies; Add, Edit and Delete. The graph and the step form are classic
 * islands. The script is the classic page's.
 */
import { ref, computed } from 'vue';
import { useWorkflowDefinitionStore } from '@/stores/workflows/definitions';
import { useWorkflowStepDefinitions } from '@/composables/workflows';
import { hasEvidenceRequirement } from '@/utils/workflows';
import type { StepDefinition } from '@/types/workflows';
import StepDAGVisualization from '@/views/workflows/partials/StepDAGVisualization.vue';
import StepForm from './StepForm.vue';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import { plural } from '@/ds/format';
import Button from '@/ds/components/Button/Button.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import Drawer from '@/ds/components/Drawer/Drawer.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can } = usePermissions();
const denied = (action: string, verb: string) =>
  can(RESOURCES.WORKFLOW_STEP_DEFINITION, action)
    ? undefined
    : `Your access doesn't include ${verb} steps.`;

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

const formOpen = computed({
  get: () => showForm.value,
  set: (open: boolean) => {
    if (!open) closeForm();
  },
});
function stepActions(step: StepDefinition): MenuEntry[] {
  return [
    {
      label: 'Edit',
      icon: 'edit',
      disabledReason: denied(ACTIONS.UPDATE, 'changing'),
      onSelect: () => editStep(step),
    },
    {
      label: 'Delete step',
      icon: 'delete',
      tone: 'danger',
      disabledReason: denied(ACTIONS.DELETE, 'deleting'),
      onSelect: () => void handleDeleteStep(step),
    },
  ];
}
</script>

<template>
  <Stack v-if="store.definition" gap="5">
    <div>
      <Button
        variant="primary"
        icon="add"
        :disabled-reason="denied(ACTIONS.CREATE, 'adding')"
        @click="openCreateForm"
        >Add step</Button
      >
    </div>
    <template v-if="store.steps.length">
      <LegacyPage>
        <StepDAGVisualization
          :steps="store.steps"
          :selected-step-id="selectedStepId ?? undefined"
          @step-click="selectStep"
        />
      </LegacyPage>
      <DataTable
        :caption="plural(sortedSteps.length, 'step')"
        caption-hidden
        :columns="[{ key: 'name', label: 'Step', minWidth: 'md' }]"
        :rows="sortedSteps"
        :row-key="(r) => r.id"
      >
        <template #cell-name="{ row: step }">
          <Stack gap="1">
            <Text as="span" variant="label">{{ step.name }}</Text>
            <Text v-if="step.description" as="span" variant="caption">{{
              step.description
            }}</Text>
            <Cluster gap="1">
              <Tag v-if="step.responsibleRole" :label="step.responsibleRole" />
              <Tag v-if="requiresEvidence(step)" label="Evidence required" />
              <Tag
                v-if="step.dependsOn?.length"
                :label="
                  plural(step.dependsOn.length, 'dependency', 'dependencies')
                "
              />
            </Cluster>
          </Stack>
        </template>
        <template #actions="{ row: step }">
          <Menu
            :label="`Actions for ${step.name}`"
            :items="stepActions(step)"
          />
        </template>
      </DataTable>
    </template>
    <Text v-else
      >No steps yet. Steps are the work each run creates, in order, such as
      "Review access list".</Text
    >
    <Drawer
      v-model:open="formOpen"
      :title="editingStep ? 'Edit step' : 'Add step'"
    >
      <StepForm
        :step="editingStep ?? undefined"
        :workflow-definition-id="store.definition.id"
        :available-steps="store.steps"
        @saved="handleStepSaved"
        @cancel="closeForm"
      />
    </Drawer>
  </Stack>
</template>
