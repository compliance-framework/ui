<template>
  <PageHeader>
    {{ result.title }}
  </PageHeader>
  <PageSubHeader>
    {{ result.uuid }}
  </PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4">
    <PageCard>
      <h3 class="text-lg pl-4 mb-4">Observations</h3>
      <div>
        <div
          v-for="(observation, index) in result.observations"
          :key="observation.uuid"
          class="px-4 py-2 hover:bg-zinc-100"
        >
          <p class="font-semibold">{{ index + 1 }}: {{ observation.title }}</p>
          <p class="pt-1">Desc: {{ observation.description }}</p>
        </div>
      </div>
    </PageCard>
    <PageCard>
      <h3 class="text-lg mb-2">Findings</h3>
      <div>
        <div
          v-for="(finding) in result.findings"
          :key="finding.uuid"
          class="py-4 border-gray-200 last:border-b-0"
        >
          <p class="font-medium">
            {{ finding.title }}
          </p>
          <p class="mb-2">
            <span
              :class="[
                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                `bg-${getFindingStatusColor(finding.target.status.state)}-50`,
                `text-${getFindingStatusColor(finding.target.status.state)}-800`,
                `ring-${getFindingStatusColor(finding.target.status.state)}-600/20`,
              ]"
            >
              {{ finding.target.status.state.toUpperCase() }}
            </span>
          </p>
          <p class="pt-1">{{ finding.description }}</p>
          <div class="pt-2 flex items-center justify-between mb-2">
            <button @click="showFindingTasks(finding)" class="px-2 py-1 border-zinc-500 border rounded-md shadow text-sm">View Tasks</button>
          </div>
        </div>
      </div>
    </PageCard>
    <PageCard>
      <h3 class="text-lg pl-4 mb-4">Logs</h3>
      <div>
        <div
          v-for="log in result.assessmentLogEntries"
          :key="log.title"
          class="px-4 py-2 hover:bg-zinc-100"
        >
          <p class="font-semibold">{{ log.title }}</p>
          <p>{{ log.description }}</p>
        </div>
      </div>
    </PageCard>

    <Modal
      :show="showFindingsModal"
      @close="setFindingsModal(false)"
    >
      <div class="px-12 py-8">
        <div v-for="task in tasks" :key="task.id">
          <div class="flex items-center">
            <div class="bg-blue-500 rounded-full w-3 aspect-square mr-2" />
            <h4 class="font-medium text-lg">{{ task.title }}</h4>
          </div>
          <div class="border-l-4 border-blue-500 ml-1 pl-4 pb-4 pt-2">
            <div v-for="activity in task.activities" :key="activity.id" class="pb-4 last:pb-0">
              <h4 class="font-medium">{{ activity.title }}
                {{ activity.title }}
              </h4>
              <div class="text-sm pl-2">
                {{ activity.description }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="border-t border-zinc-300 text-right py-2 px-4">
        <button @click="setFindingsModal(false)" class="px-2 py-1 border-zinc-500 border rounded-md shadow">Close</button>
      </div>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import Modal from '@/components/Modal.vue';
import { type Finding, type Result, type Task, useApiStore } from '@/stores/api'

const apiStore = useApiStore();
const route = useRoute();
const id = route.params.id as string;

const result = ref<Result>({} as Result);
const tasks = ref<Task[]>([] as Task[]);
const showLogsModal = ref(false);
const showFindingsModal = ref(false);

enum FindingStatusColor {
  UNKNOWN = 'grey',
  OPEN = 'red',
  MITIGATED = 'yellow',
  RESOLVED = 'green',
}

function showFindingTasks(finding: Finding) {
  tasks.value = finding.tasks
  setFindingsModal(true);
}

function setFindingsModal(open: boolean) {
  showFindingsModal.value = open;
}

function getFindingStatusColor(status?: string): string {
  return (
    FindingStatusColor[status as keyof typeof FindingStatusColor] ||
    FindingStatusColor.UNKNOWN
  );
}

onMounted(() => {
  apiStore.getResult(id).then((res) => {
    result.value = res.data;
  });
});
</script>
