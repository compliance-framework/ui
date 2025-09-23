<script setup lang="ts">
import type { Activity, Step } from '@/oscal';

import Timeline from '@/volt/Timeline.vue';
import Panel from '@/volt/Panel.vue';

import { useToggle } from '@/composables/useToggle';
import Dialog from '@/volt/Dialog.vue';
import ActivityEditForm from './ActivityEditForm.vue';
import VueMarkdown from 'vue-markdown-render';

import { useSortable } from '@vueuse/integrations/useSortable';
import { useTemplateRef, ref, watch, toValue } from 'vue';
import { useActivityStore } from '@/stores/activities';
import { useToast } from 'primevue/usetoast';
import StepEditForm from './StepEditForm.vue';
import Button from '@/volt/Button.vue';
import { BIconPencil } from 'bootstrap-icons-vue';
import StepCreateForm from './StepCreateForm.vue';

const { value: editingActivity, set: setEditingActivity } = useToggle(false);
const { value: editingStep, set: setEditingStep } = useToggle(false);
const { value: creatingStep, set: setCreatingStep } = useToggle(false);
const activityStore = useActivityStore();
const toast = useToast();

const props = defineProps<{
  activity: Activity;
}>();

const emit = defineEmits<{
  updated: [activity: Activity];
  remove: [activity: Activity];
}>();

const stepList = ref<Step[]>(props.activity?.steps || []);
const currentStep = ref<Step>({} as Step);

const steps = useTemplateRef<HTMLElement>('steps');
useSortable(steps, stepList, {
  dragoverBubble: true,
});

watch(stepList, () => {
  updateActivity({
    ...props.activity,
    steps: toValue(stepList),
  });
});

async function onStepUpdated(step: Step) {
  const activity = {
    ...props.activity,
    steps: stepList.value.map((i) => {
      if (i.uuid == step.uuid) {
        return step;
      }
      return i;
    }),
  };
  await updateActivity(activity);
  emit('updated', activity);
  setEditingStep(false);
}

async function onStepCreated(step: Step) {
  stepList.value.push(step);
  const activity = {
    ...props.activity,
    steps: stepList.value,
  };
  await updateActivity(activity);
  emit('updated', activity);
  setCreatingStep(false);
}

async function onActivityUpdated(activity: Activity) {
  emit('updated', activity);
  setEditingActivity(false);
}

async function remove() {
  emit('remove', props.activity);
}

function editStep(step: Step) {
  currentStep.value = step;
  setEditingStep(true);
}

async function updateActivity(activity: Activity): Promise<void> {
  try {
    await activityStore.update(props.activity.uuid, activity);

    toast.add({
      severity: 'success',
      summary: 'Activity Updated',
      detail: 'Activity has been updated successfully',
      life: 3000,
    });

    emit('updated', activity);
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error Updating Activity',
      detail:
        error instanceof Error ? error.message : 'Failed to update activity',
      life: 3000,
    });
  }
}
</script>

<template>
  <Panel toggleable class="my-2">
    <template #header>
      <div class="flex items-center gap-2 py-2">
        <span class="font-bold">{{ props.activity?.title }}</span>
        <!-- <Badge value="AC-1" severity="info" /> -->
        <div class="flex gap-2">
          <button
            @click="setEditingActivity(true)"
            class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Edit
          </button>
          <button
            @click="remove"
            class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            Remove
          </button>
        </div>
      </div>
    </template>
    <div class="border-t border-gray-200 dark:border-slate-700">
      <div
        v-if="props.activity.description"
        class="prose prose-slate dark:prose-invert w-full max-w-full"
      >
        <VueMarkdown :source="props.activity.description" />
      </div>

      <div
        v-if="props.activity.remarks"
        class="mt-2 prose prose-slate dark:prose-invert"
      >
        <h5 class="font-medium dark:text-slate-200">Remarks:</h5>
        <VueMarkdown :source="props.activity.remarks" />
      </div>

      <h5 class="font-medium text-lg mt-4">Steps:</h5>
      <Timeline
        :value="stepList"
        :hide-opposite="true"
        class="mt-8"
        ref="steps"
      >
        <template #content="slotProps">
          <div class="flex items-center">
            <h5>{{ slotProps.item.title }}</h5>
            <Button
              variant="text"
              size="small"
              @click="editStep(slotProps.item)"
              ><BIconPencil
            /></Button>
          </div>
          <p class="py-2 fonnt-light">{{ slotProps.item.description }}</p>
        </template>
      </Timeline>
      <Button size="small" @click="setCreatingStep(true)">Add Step</Button>
    </div>
  </Panel>

  <Dialog
    header="Edit Activity"
    size="lg"
    v-model:visible="editingActivity"
    modal
  >
    <ActivityEditForm
      @updated="onActivityUpdated"
      @cancel="setEditingActivity(false)"
      :activity="activity"
    />
  </Dialog>

  <Dialog
    header="Create Step"
    size="lg"
    v-model:visible="creatingStep"
    modal
    :draggable="false"
  >
    <StepCreateForm @submit="onStepCreated" @cancel="setCreatingStep(false)" />
  </Dialog>

  <Dialog
    header="Edit Step"
    size="lg"
    v-model:visible="editingStep"
    modal
    :draggable="false"
  >
    <StepEditForm
      @submit="onStepUpdated"
      @cancel="setEditingStep(false)"
      :step="currentStep"
    />
  </Dialog>
</template>
