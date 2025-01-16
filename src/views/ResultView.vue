<template>
  <PageHeader>
    {{ result.title }}
  </PageHeader>
  <PageSubHeader>
    {{ result._id }}
  </PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4">
    <PageCard @click="toggleObservationsModal">
      <h3 class="text-lg pl-4 mb-4">Observations</h3>
      <div>
        <div
          v-for="(observation, index) in result.observations"
          :key="observation.id"
          class="px-4 py-2 hover:bg-zinc-100"
        >
          <p class="font-semibold">{{ index + 1 }}: {{ observation.title }}</p>
          <p class="pt-1">Desc: {{ observation.description }}</p>
        </div>
      </div>
    </PageCard>
    <Modal
      title="Observations"
      v-model:show="showObservationsModal"
      @click="toggleObservationsModal"
    >
      <h3 class="text-lg pl-4 mb-4">Observations</h3>
      <div>
        <div
          v-for="(observation, index) in result.observations"
          :key="observation.id"
          class="px-4 py-2 hover:bg-zinc-100"
        >
          <p class="font-semibold">{{ index + 1 }}: {{ observation.title }}</p>
          <p class="pt-1">Desc: {{ observation.description }}</p>
        </div>
      </div>
    </Modal>
    <PageCard @click="toggleFindingsModal">
      <h3 class="text-lg pl-4 mb-4">Findings</h3>
      <div>
        <div
          v-for="(finding, findingIdx) in result.findings"
          :key="finding.id"
          class="p-* px-4 py-2 hover:bg-zinc-100"
        >
          <p class="font-semibold">{{ findingIdx + 1 }}. {{ finding.title }}</p>
          <p class="pt-1">Desc: {{ finding.description }}</p>
          <p v-if="finding.status" :class="['pt-1', 'text-black-800']">
            Status:
            <span
              :class="[
                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                `bg-${getFindingStatusColor(finding.status)}-50`,
                `text-${getFindingStatusColor(finding.status)}-800`,
                `ring-${getFindingStatusColor(finding.status)}-600/20`,
              ]"
            >
              {{ finding.status }}
            </span>
          </p>
          <div class="pt-2 flex items-center justify-between w-full">
            <p>Tasks: {{ finding.tasks.length }}</p>
            <span class="mr-5">(Click for more details)</span>
          </div>
        </div>
      </div>
    </PageCard>
    <Modal
      title="Findings"
      v-model:show="showFindingsModal"
      @click="toggleFindingsModal"
    >
      <h3 class="text-lg pl-4 mb-4">Findings</h3>
      <div>
        <div
          v-for="(finding, findingIdx) in result.findings"
          :key="finding.id"
          class="p-* px-4 py-2 hover:bg-zinc-100"
        >
          <p class="font-semibold">{{ findingIdx + 1 }}. {{ finding.title }}</p>
          <p class="pt-1">Desc: {{ finding.description }}</p>
          <p v-if="finding.status" :class="['pt-1', 'text-black-800']">
            Status:
            <span
              :class="[
                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
                `bg-${getFindingStatusColor(finding.status)}-50`,
                `text-${getFindingStatusColor(finding.status)}-800`,
                `ring-${getFindingStatusColor(finding.status)}-600/20`,
              ]"
            >
              {{ finding.status }}
            </span>
          </p>
          <p class="pt-1">Tasks:</p>
          <ol class="pl-6 pt-2 list-decimal">
            <li v-for="task in finding.tasks" :key="task.id">
              <p class="mb-2">Title: {{ task.title }}</p>
              <p class="mb-2">Description: {{ task.description }}</p>
              <p>Activities:</p>
              <ol class="pl-6 pt-2 list-decimal">
                <li v-for="activity in task.activities" :key="activity.id">
                  <p>Title: {{ task.title }}</p>
                  <p>Description: {{ task.description }}</p>
                </li>
              </ol>
            </li>
          </ol>
        </div>
      </div>
    </Modal>
    <PageCard @click="toggleLogsModal">
      <h3 class="text-lg pl-4 mb-4">Logs</h3>
      <div>
        <div
          v-for="log in result.assessmentLogEntries"
          class="px-4 py-2 hover:bg-zinc-100"
        >
          <p class="font-semibold">{{ log.title }}</p>
          <p>{{ log.description }}</p>
        </div>
      </div>
    </PageCard>
    <Modal title="Logs" v-model:show="showLogsModal" @click="toggleLogsModal">
      <h3 class="text-lg pl-4 mb-4">Logs</h3>
      <div>
        <div
          v-for="log in result.assessmentLogEntries"
          class="px-4 py-2 hover:bg-zinc-100"
        >
          <p class="font-semibold">{{ log.title }}</p>
          <p>{{ log.description }}</p>
        </div>
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
import { type Result, useApiStore } from '@/stores/api';

const apiStore = useApiStore();
const route = useRoute();
const id = route.params.id as string;

const result = ref<Result>({} as Result);
const showObservationsModal = ref(false);
const showLogsModal = ref(false);
const showFindingsModal = ref(false);

enum FindingStatusColor {
  UNKNOWN = 'grey',
  OPEN = 'red',
  MITIGATED = 'yellow',
  RESOLVED = 'green',
}

function toggleObservationsModal() {
  showObservationsModal.value = !showObservationsModal.value;
}

function toggleFindingsModal() {
  showFindingsModal.value = !showFindingsModal.value;
}

function toggleLogsModal() {
  showLogsModal.value = !showLogsModal.value;
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
