<script setup lang="ts">
import type { Activity } from '@/oscal';

import Timeline from '@/volt/Timeline.vue';
import Panel from '@/volt/Panel.vue';

import { useToggle } from '@/composables/useToggle';
import Dialog from '@/volt/Dialog.vue';
import ActivityEditForm from './ActivityEditForm.vue';
import VueMarkdown from 'vue-markdown-render';

const {
  value: editing,
  toggle: toggleEditing,
  set: setEditing,
} = useToggle(false);

const props = defineProps<{
  activity: Activity;
}>();

const emit = defineEmits<{
  updated: [activity: Activity];
  remove: [activity: Activity];
}>();

async function onActivityUpdated(activity: Activity) {
  emit('updated', activity);
  setEditing(false);
}

async function remove() {
  emit('remove', props.activity);
}
</script>

<template>
  <Panel toggleable collapsed class="my-2">
    <template #header>
      <div class="flex items-center gap-2 py-2">
        <span class="font-bold">{{ props.activity?.title }}</span>
        <!-- <Badge value="AC-1" severity="info" /> -->
        <div class="flex gap-2">
          <button
            @click="toggleEditing"
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
        :value="props.activity?.steps"
        :hide-opposite="true"
        class="mt-8"
      >
        <template #content="slotProps">
          <h2 class="font-medium">{{ slotProps.item.title }}</h2>
          <p class="py-2">{{ slotProps.item.description }}</p>
        </template>
      </Timeline>
    </div>
  </Panel>

  <Dialog header="Edit Activity" size="lg" v-model:visible="editing" modal>
    <ActivityEditForm
      @updated="onActivityUpdated"
      @cancel="toggleEditing"
      :activity="activity"
    />
  </Dialog>
</template>
