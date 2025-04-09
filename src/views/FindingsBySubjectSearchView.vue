<template>
  <PageHeader>Findings by Subject</PageHeader>
  <PageSubHeader>Search for findings using subjects</PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4">
    <PageCard>
      <h3 class="text-lg font-semibold text-zinc-600 dark:text-slate-300">
        Compliance over time
      </h3>
      <div class="h-32">
        <ResultComplianceOverTimeChart :data="complianceChartData" />
      </div>
    </PageCard>
    <PageCard>
      <h3 class="text-lg font-semibold text-zinc-600 dark:text-slate-300">
        Agent health
      </h3>
      <div class="h-32">
        <ResultComplianceOverTimeChart :data="heartbeatChartData" />
      </div>
    </PageCard>
  </div>

  <div class="mt-4">
    <div class="flex gap-4">
      <form @submit.prevent="search" class="grow">
        <div
          class="flex border rounded-md text-zinc-700 dark:text-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700"
        >
          <div class="pl-4 my-auto">
            <BIconSearch
              class="mr-2"
              height="1.2rem"
              width="1.2rem"
            ></BIconSearch>
          </div>
          <input
            type="text"
            v-model="filter"
            id="filter"
            name="filter"
            placeholder="foo=bar AND bar=baz AND (bar!=bat OR bar!=bat)"
            class="grow px-2 py-2 focus:border-none focus-visible:border-none focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:outline-none bg-white dark:bg-slate-900"
          />
          <SecondaryButton type="submit" class="border-none">
            Search
          </SecondaryButton>
        </div>
      </form>
      <PrimaryButton
        @click="configStore.toggleLabels()"
        class="flex items-center gap-1 text-sm"
      >
        <BIconFilter height="1.7em" width="1.7em" />
        <span v-if="configStore.showLabels">Hide Labels</span
        ><span v-else>Show Labels</span>
      </PrimaryButton>
    </div>
  </div>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  >
    <div v-for="subject in subjectFindings" :key="subject.subject">
      <CollapsableGroup>
        <template #header>
          <div class="flex items-center px-4 gap-4">
            <div class="py-3">
              <ResultStatusBadge
                :gray="
                  subject.findings.reduce(
                    (total, current) =>
                      ['satisfied', 'not satisfied'].includes(
                        current.status?.state.toLowerCase(),
                      )
                        ? total
                        : total + 1,
                    0,
                  )
                "
                :red="
                  subject.findings.reduce(
                    (total, current) =>
                      current.status?.state.toLowerCase() == 'not satisfied'
                        ? total + 1
                        : total,
                    0,
                  )
                "
                :green="
                  subject.findings.reduce(
                    (total, current) =>
                      current.status?.state.toLowerCase() == 'satisfied'
                        ? total + 1
                        : total,
                    0,
                  )
                "
              ></ResultStatusBadge>
            </div>
            <div class="w-1/4 py-1">{{ subjects[subject.subject]?.title }}</div>
            <div class="flex-1 ml-4" v-if="configStore.showLabels">
              <LabelList :labels="subjects[subject.subject]?.attributes || {}" :exclude-keys="['instance-name', 'image-id']" />
            </div>
          </div>
        </template>
        <div class="px-4">
          <FindingsList :findings="subject.findings" />
        </div>
      </CollapsableGroup>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import { FilterParser } from '@/parsers/labelfilter.ts'
import { BIconEyeFill, BIconFilter, BIconFloppy, BIconSearch } from 'bootstrap-icons-vue'
import LabelList from '@/components/LabelList.vue'
import type { ChartData } from 'chart.js'
import {
  calculateComplianceOverTimeData,
  type DateDataPoint,
} from '@/parsers/findings.ts'
import ResultComplianceOverTimeChart from '@/components/ResultComplianceOverTimeChart.vue'
import ResultStatusBadge from '@/components/ResultStatusBadge.vue'
import { type FindingBySubject, useFindingsStore } from '@/stores/findings.ts'
import { useHeartbeatsStore } from '@/stores/heartbeats.ts'
import { calculateHeartbeatOverTimeData } from '@/parsers/heartbeats.ts'
import CollapsableGroup from '@/components/CollapsableGroup.vue'
import { type Subject, useSubjectsStore } from '@/stores/subjects.ts'
import ResultStatusRing from '@/components/ResultStatusRing.vue'
import { useConfigStore } from '@/stores/config.ts'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import FindingsList from '@/views/FindingsList.vue'

const subjectStore = useSubjectsStore()
const findingsStore = useFindingsStore()
const heartbeatStore = useHeartbeatsStore()
const configStore = useConfigStore()
const route = useRoute()
const router = useRouter()

const filter = ref<string>('')
if (route.query.filter) {
  filter.value = route.query.filter as string
}
const subjectFindings = ref<FindingBySubject[]>([])
const subjects = ref<Record<string, Subject>>({ } as Record<string, Subject>)
const complianceChartData = ref<ChartData<'line', DateDataPoint[]>>({
  labels: [],
  datasets: [],
})
const heartbeatChartData = ref<ChartData<'line', DateDataPoint[]>>({
  labels: [],
  datasets: [],
})

async function search() {
  const query = new FilterParser(filter.value).parse()
  await router.push({ query: { filter: filter.value }})
  findingsStore.searchBySubject(query).then((response) => {
    subjectFindings.value = response.data;
    // results.value = response.data
    response.data.forEach((subject) => {
      subjectStore.get(subject.subject).then((response) => {
        const something = subjects.value;
        something[subject.subject] = response.data as Subject;
        subjects.value = something;
      });
    });
  })

  findingsStore.getComplianceForSearch(query).then((response) => {
    complianceChartData.value = calculateComplianceOverTimeData(response.data)
  })
  heartbeatStore.overTime().then((response) => {
    heartbeatChartData.value = calculateHeartbeatOverTimeData(response.data)
  })
}

async function save() {
  await router.push({ name: 'assessment-plan.create', query: { filter: filter.value } })
}

onMounted(() => {
  search()
})
</script>
