<template>
  <PageHeader>Findings by Subject</PageHeader>
  <!--  <PageSubHeader>Search for findings using labels</PageSubHeader>-->
  <div class="grid grid-cols-2 gap-4 mt-4">
    <div class="bg-white rounded shadow">
      <div class="px-4 pt-2">
        <h3 class="text-lg font-semibold text-zinc-600">
          Compliance over time
        </h3>
      </div>
      <div class="h-32">
        <ResultComplianceOverTimeChart :data="complianceChartData" />
      </div>
    </div>
    <div class="bg-white rounded shadow">
      <div class="px-4 pt-2">
        <h3 class="text-lg font-semibold text-zinc-600">Agent health</h3>
      </div>
      <div class="h-32">
        <ResultComplianceOverTimeChart :data="heartbeatChartData" />
      </div>
    </div>
  </div>

  <PageCard class="mt-4">
    <h3 class="text-lg mb-4">Search</h3>
    <div>
      <form @submit.prevent="search">
        <div class="flex items-center">
          <input
            type="text"
            v-model="filter"
            id="filter"
            name="filter"
            placeholder="foo=bar AND bar=baz AND (bar!=bat OR bar!=bat)"
            class="w-full rounded-l-md border-black border-y border-l px-4 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <button
            type="submit"
            class="flex items-center border-y text-sm border-black bg-white text-black hover:bg-gray-100 p-2"
          >
            <BIconSearch class="mr-2"></BIconSearch>
            Search
          </button>
          <button
            @click.prevent="save"
            class="bg-blue-800 text-white hover:bg-blue-700 p-3 rounded-r-md"
          >
            <BIconFloppy></BIconFloppy>
          </button>
        </div>
      </form>
    </div>
    <div class="mt-4">
      <div v-for="subject in subjectFindings" :key="subject.subject">
        <CollapsableGroup>
          <template #header>
            <div class="w-full grid grid-cols-6 py-2 px-4 items-center">
              <div>
                {{ subjects[subject.subject]?.title }}
              </div>
              <div>
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
              <div class="col-span-4">
                <LabelList :labels="subjects[subject.subject]?.attributes" />
              </div>
            </div>
          </template>
          <FindingsList :findings="subject.findings" />
        </CollapsableGroup>
      </div>
    </div>
  </PageCard>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type LabelMap } from '@/stores/api'
import { FilterParser } from '@/parsers/labelfilter.ts'
import { BIconFloppy, BIconSearch } from 'bootstrap-icons-vue'
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
import FindingsList from '@/views/FindingsList.vue'
import CollapsableGroup from '@/components/CollapsableGroup.vue'
import { type Subject, useSubjectsStore } from '@/stores/subjects.ts'

const subjectStore = useSubjectsStore()
const findingsStore = useFindingsStore()
const heartbeatStore = useHeartbeatsStore()
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
