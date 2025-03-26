<template>
  <PageHeader>Findings</PageHeader>
  <PageSubHeader>Search for findings using labels</PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4">
    <div class="bg-white rounded shadow">
      <div class="px-4 pt-2">
        <h3 class="text-lg font-semibold text-zinc-600">Compliance over time</h3>
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
        <ResultComplianceOverTimeChart :data="uptimeChartData" />
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
          <button @click.prevent="save" class="bg-blue-800 text-white hover:bg-blue-700 p-3 rounded-r-md">
            <BIconFloppy></BIconFloppy>
          </button>
        </div>
      </form>
    </div>
    <div class="mt-4">
      <div
        class="flex items-center border-t first:border-none hover:bg-zinc-100 py-2 px-2"
        v-for="finding in findings"
        :key="finding.uuid"
      >
        <div class="shrink-0 pr-4">
          <ResultStatusBadge :state="finding.status.state?.toLowerCase()"></ResultStatusBadge>
        </div>
        <div class="w-1/3">{{ finding.title }}</div>
        <div class="flex-wrap grow">
          <LabelList :labels="viewableLabels(finding.labels)" />
        </div>
        <div>
          <RouterLink
            class="bg-gray-50 hover:bg-gray-200 text-blue-800 border border-blue-800 px-4 py-1 rounded-md text-sm mr-2"
            :to="{ name: 'finding-history', params: { uuid: finding.uuid } }"
            >History
          </RouterLink>
          <RouterLink
            class="bg-blue-800 hover:bg-clue-700 text-white px-4 py-1 rounded-md text-sm"
            :to="{ name: 'finding-view', params: { id: finding._id } }"
            >View
          </RouterLink>
        </div>
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
import { type Finding, useFindingsStore } from '@/stores/findings.ts'

const findingsStore = useFindingsStore()
const route = useRoute()
const router = useRouter()

const filter = ref<string>('')
if (route.query.filter) {
  filter.value = route.query.filter as string
}
const findings = ref<Finding[]>([])
const complianceChartData = ref<ChartData<'line', DateDataPoint[]>>({
  labels: [],
  datasets: [],
})
const uptimeChartData = ref<ChartData<'line', DateDataPoint[]>>({
  labels: [],
  datasets: [],
})

function viewableLabels(labels: LabelMap) {
  const viewable: LabelMap = {}
  for (const label in labels) {
    if (label.substring(0, 1) != '_') {
      viewable[label] = labels[label]
    }
  }
  return viewable
}

async function search() {
  const query = new FilterParser(filter.value).parse()
  await router.push({ query: { filter: filter.value }})
  findingsStore.search(query).then((response) => {
    findings.value = response.data.sort(function (a, b) {
      // Order results by their title for better UI consistency
      const x = new Date(a.collected);
      const y = new Date(b.collected);

      if (x > y) {
        return 1
      }
      if (x < y) {
        return -1
      }
      return 0
    })
    // results.value = response.data
  })

  findingsStore.getComplianceForSearch(query).then((response) => {
    complianceChartData.value = calculateComplianceOverTimeData(response.data)
    // uptimeChartData.value = calculateAgentUptimeData(response.data)
  })
}

async function save() {
  await router.push({ name: 'assessment-plan.create', query: { filter: filter.value } })
}

onMounted(() => {
  search()
})
</script>
