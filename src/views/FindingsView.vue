<template>
  <PageHeader>
    {{ finding.title }}
  </PageHeader>
  <PageSubHeader>
    {{ finding.uuid }}
  </PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4">
    <PageCard>
      <h3 class="text-lg flex items-center">
        Finding
        <span
          :class="[
            'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ml-4',
            getFindingStatusColor(finding.status?.state),
          ]"
        >
          {{ finding.status?.state.toUpperCase() }}
        </span>
      </h3>
      <div>
        <div class="border-gray-200 last:border-b-0">
          <p class="text-sm text-gray-800 mb-2">
            Collected {{ new Date(finding.collected).toLocaleString() }}
          </p>
          <p class="font-medium mt-4">
            {{ finding.title }}
          </p>
          <p class="pt-1">{{ finding.description }}</p>
          <div class="pt-2 flex items-center justify-between mb-2">
            <button
              @click="showFindingTasks(finding)"
              class="px-2 py-1 border-zinc-500 border rounded-md shadow text-sm"
            >
              View Tasks
            </button>
          </div>
        </div>
      </div>
    </PageCard>
    <PageCard>
      <h3 class="text-lg pl-4 mb-4">Subjects</h3>
      <div>
        <div
          v-for="(subject, index) in subjects"
          :key="subject._id"
          class="px-4 py-2 hover:bg-zinc-100"
        >
          <p class="font-semibold">Type: {{ subject.type }}</p>
          <p class="mt-2 mb-2">Attributes</p>
          <table>
            <tbody>
              <tr v-for="(value, key) in subject.attributes" :key="key" class="table-fixed border-collapse border border-gray-500">
                <td class="border border-gray-500 px-2 py-1">{{ key }}</td>
                <td class="border border-gray-500 px-2 py-1">{{ value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PageCard>
    <PageCard>
      <h3 class="text-lg pl-4 mb-4">Observations</h3>
      <div>
        <div
          v-for="observation in observations"
          :key="observation._id"
          class="px-4 py-2 hover:bg-zinc-100"
        >
          <p class="font-semibold">{{ observation.title }}</p>
          <p>{{ observation.description }}</p>
          <p>{{ (new Date(observation.collected)).toLocaleString() }}</p>
        </div>
      </div>
    </PageCard>


    <!--    <PageCard>-->
    <!--      <h3 class="text-lg pl-4 mb-4">Logs</h3>-->
    <!--      <div>-->
    <!--        <div-->
    <!--          v-for="log in result.assessmentLogEntries"-->
    <!--          :key="log.title"-->
    <!--          class="px-4 py-2 hover:bg-zinc-100"-->
    <!--        >-->
    <!--          <p class="font-semibold">{{ log.title }}</p>-->
    <!--          <p>{{ log.description }}</p>-->
    <!--        </div>-->
    <!--      </div>-->
    <!--    </PageCard>-->

    <Modal :show="showFindingsModal" @close="setFindingsModal(false)">
      <div class="px-12 py-8">
        <div v-for="task in tasks" :key="task.id">
          <div class="flex items-center">
            <div class="bg-blue-500 rounded-full w-3 aspect-square mr-2" />
            <h4 class="font-medium text-lg">{{ task.title }}</h4>
          </div>
          <div class="border-l-4 border-blue-500 ml-1 pl-4 pb-4 pt-2">
            <div
              v-for="activity in task.activities"
              :key="activity.id"
              class="pb-4 last:pb-0"
            >
              <h4 class="font-medium">
                {{ activity.title }}
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
        <button
          @click="setFindingsModal(false)"
          class="px-2 py-1 border-zinc-500 border rounded-md shadow"
        >
          Close
        </button>
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
import { useFindingsStore, type Finding } from '@/stores/findings.ts';
import { type Observation, useObservationsStore } from '@/stores/observations.ts'
import { type Subject, useSubjectsStore } from '@/stores/subjects.ts'

const findingsStore = useFindingsStore();
const observationsStore = useObservationsStore();
const subjectsStore = useSubjectsStore();
const route = useRoute();
const id = route.params.id as string;

const finding = ref<Finding>({} as Finding);
const observations = ref<Observation[]>([] as Observation[]);
const subjects = ref<Subject[]>([] as Subject[]);
const tasks = ref<Task[]>([] as Task[]);
const showLogsModal = ref(false);
const showFindingsModal = ref(false);

enum FindingStatusColor {
  UNKNOWN = 'grey',
  SATISFIED = 'bg-green-50 text-green-800 ring-green-600/20',
  'NOT SATISFIED' = 'bg-red-50 text-red-800 ring-red-600/20',
}

function showFindingTasks(finding: Finding) {
  tasks.value = finding.tasks;
  setFindingsModal(true);
}

function setFindingsModal(open: boolean) {
  showFindingsModal.value = open;
}

function getFindingStatusColor(status?: string): string {
  return (
    FindingStatusColor[
      status?.toUpperCase() as keyof typeof FindingStatusColor
    ] || FindingStatusColor.UNKNOWN
  );
}

onMounted(() => {
  findingsStore.get(id).then((res) => {
    finding.value = res.data;
    res.data.observations?.forEach(id => {
      observationsStore.get(id).then((observation) => {
        observations.value = [observation.data, ...observations.value];
      })
    })
    res.data.subjects?.forEach(id => {
      subjectsStore.get(id).then((subject) => {
        subjects.value = [subject.data, ...subjects.value];
      })
    })
  });
});
</script>
