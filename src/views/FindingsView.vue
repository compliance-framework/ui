<template>
  <PageHeader>
    {{ finding.title }}
  </PageHeader>
  <PageSubHeader>
    {{ finding.uuid }}
  </PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4 items-start">
    <div>
      <PageCard>
        <h3 class="text-lg flex items-center mb-2">
          <span>
            Finding
          </span>
          <span
            :class="[
              'rounded-md px-2 py-1 text-sm ml-4 font-light',
              getFindingStatusColor(finding.status?.state),
            ]"
          >
            {{ finding.status?.state.toUpperCase() }}
          </span>
        </h3>
        <div>
          <p class="text-sm text-gray-800 dark:text-slate-300">
            Collected {{ new Date(finding.collected).toLocaleString() }}
          </p>
          <p class="font-medium mt-4">
            {{ finding.title }}
          </p>
          <p class="pt-1">{{ finding.description }}</p>
          <p class="pt-1">{{ finding.remarks }}</p>
        </div>
      </PageCard>
      <PageCard class="mt-4">
        <h3 class="text-lg">Observations</h3>
        <div
          v-for="observation in observations"
          :key="observation._id"
          class="mt-2"
        >
          <p class="font-semibold">{{ observation.title }}</p>
          <p class="text-sm text-gray-800 dark:text-slate-300 mb-2">
            Collected {{ new Date(finding.collected).toLocaleString() }}
          </p>
          <p>{{ observation.description }}</p>
          <p>{{ observation.remarks }}</p>
          <SecondaryButton
            @click="showActivities(observation)"
            class="mt-4"
          >
            View Tasks
          </SecondaryButton>
        </div>
      </PageCard>
    </div>
    <PageCard>
      <h3 class="text-lg mb-2">Subjects</h3>
      <div class="grid grid-cols-2 gap-4 items-start">
        <div
          v-for="subject in subjects"
          :key="subject._id"
        >
          <p class="font-semibold">Type: {{ subject.type }}</p>
          <p class="mb-2">Attributes</p>
          <table class="w-full table-auto">
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

    <Modal :show="showActivitiesModal" @close="toggleActivitiesModal(false)">
      <div class="px-12 py-8">
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
      <div class="border-t border-zinc-300 dark:border-slate-700 text-right py-4 px-4">
        <PrimaryButton
          @click="toggleActivitiesModal(false)"
          class="px-2 py-1 border-zinc-500 border rounded-md shadow"
        >
          Close
        </PrimaryButton>
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
import type { Activity } from '@/stores/types.ts'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'

const findingsStore = useFindingsStore();
const observationsStore = useObservationsStore();
const subjectsStore = useSubjectsStore();
const route = useRoute();
const id = route.params.id as string;

const finding = ref<Finding>({} as Finding);
const observations = ref<Observation[]>([] as Observation[]);
const subjects = ref<Subject[]>([] as Subject[]);
const activities = ref<Activity[]>([] as Activity[]);
const showActivitiesModal = ref(false);

enum FindingStatusColor {
  UNKNOWN = 'grey',
  SATISFIED = 'bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-500 border border-green-800 dark:border-green-600',
  'NOT SATISFIED' = 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-500 border border-red-800 dark:border-red-600',
}

function showActivities(observation: Observation) {
  activities.value = observation.activities || [];
  toggleActivitiesModal(true);
}

function toggleActivitiesModal(open: boolean) {
  showActivitiesModal.value = open;
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
