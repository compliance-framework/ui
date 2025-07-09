<template>
  <PageHeader>
    {{ evidence.title }}
  </PageHeader>
  <PageSubHeader>
    {{ evidence.uuid }}
  </PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4 items-start">
    <div>
      <PageCard>
        <h3 class="text-lg flex items-center mb-2">
          <span>
            Evidence
          </span>
          <span
            :class="[
              'rounded-md px-2 py-1 text-sm ml-4 font-light',
              getEvidenceStatusColor(evidence.status?.state),
            ]"
          >
            {{ evidence.status?.state.toUpperCase() }}
          </span>
        </h3>
        <div>
          <p class="text-sm text-gray-800 dark:text-slate-300">
            Collected {{ new Date(evidence.end).toLocaleString() }}
          </p>
          <p class="font-medium mt-4">
            {{ evidence.title }}
          </p>
          <p class="pt-1">{{ evidence.description }}</p>
          <SecondaryButton
            @click="showActivities(evidence)"
            class="mt-4"
          >
            View Tasks
          </SecondaryButton>
        </div>
      </PageCard>
    </div>

    <Dialog
      v-model:visible="showActivitiesModal"
      maximizable
      modal
      header="Tasks">
      <div class="px-12 flex-grow">
        <div v-for="activity in activities" :key="activity.uuid">
          <div class="flex items-center">
            <div class="bg-blue-500 rounded-full w-3 aspect-square mr-2" />
            <h4 class="font-medium text-lg">{{ activity.title }}</h4>
          </div>
          <div class="border-l-4 border-blue-500 ml-1 pl-4 pb-4 pt-2">
            <div
              v-for="step in activity.steps"
              :key="step.uuid"
              class="pb-4 last:pb-0"
            >
              <h4 class="font-medium">
                {{ step.title }}
              </h4>
              <div class="text-sm pl-2">
                {{ step.description }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-4 border-t border-zinc-300 dark:border-slate-400 text-right py-4 px-4">
        <SecondaryButton
          @click="toggleActivitiesModal(false)"
          class="px-2 py-1 shadow"
        >
          Close
        </SecondaryButton>
      </div>
    </Dialog>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import type { Activity } from '@/stores/types.ts'
import SecondaryButton from '@/volt/SecondaryButton.vue'

import Dialog from '@/volt/Dialog.vue';
import { type Evidence, useEvidenceStore } from '@/stores/evidence.ts'

const evidenceStore = useEvidenceStore();
const route = useRoute();
const id = route.params.id as string;

const evidence = ref<Evidence>({} as Evidence);
const activities = ref<Activity[]>([] as Activity[]);
const showActivitiesModal = ref(false);

enum FindingStatusColor {
  UNKNOWN = 'grey',
  SATISFIED = 'bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-500 border border-green-800 dark:border-green-600',
  'NOT-SATISFIED' = 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-500 border border-red-800 dark:border-red-600',
}

function showActivities(evidence: Evidence) {
  activities.value = evidence.activities || [];
  toggleActivitiesModal(true);
}

function toggleActivitiesModal(open: boolean) {
  showActivitiesModal.value = open;
}

function getEvidenceStatusColor(status?: string): string {
  return (
    FindingStatusColor[
      status?.toUpperCase() as keyof typeof FindingStatusColor
    ] || FindingStatusColor.UNKNOWN
  );
}

onMounted(() => {
  evidenceStore.get(id).then((res) => {
    evidence.value = res.data;
  });
});
</script>
