<template>
  <PageHeader>Findings</PageHeader>
  <PageSubHeader>Search for findings using labels</PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4">
    <PageCard>
      <h3 class="text-lg font-semibold text-zinc-600 dark:text-slate-300">Compliance over time</h3>
      <div class="h-32">
        <ResultComplianceOverTimeChart :data="complianceChartData" />
      </div>
    </PageCard>
    <PageCard>
      <h3 class="text-lg font-semibold text-zinc-600 dark:text-slate-300">Agent health</h3>
      <div class="h-32">
        <ResultComplianceOverTimeChart :data="heartbeatChartData" />
      </div>
    </PageCard>
  </div>

  <div class="mt-4">
    <div class="flex gap-4">
      <form @submit.prevent="search" class="grow">
        <div class="flex border rounded-md text-zinc-700 dark:text-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700">
          <div class="pl-4 my-auto ">
            <BIconSearch class="mr-2 " height="1.2rem" width="1.2rem"></BIconSearch>
          </div>
          <input
            type="text"
            v-model="filter"
            id="filter"
            name="filter"
            placeholder="foo=bar AND bar=baz AND (bar!=bat OR bar!=bat)"
            class="grow px-2 py-2 focus:border-none focus-visible:border-none focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:outline-none bg-white dark:bg-slate-900"
          />
          <SecondaryButton
            type="submit"
            class="border-none"
          >
            Search
          </SecondaryButton>
        </div>
      </form>
      <SecondaryButton @click.prevent="save" class="text-sm">
        Save Search
      </SecondaryButton>
      <PrimaryButton @click="configStore.toggleLabels()" class="flex items-center gap-1 text-sm">
        <SomeIcon height="1.7em" width="1.7em" /><span v-if="configStore.showLabels">Hide Labels</span><span v-else>Show Labels</span>
      </PrimaryButton>
    </div>
  </div>


  <div class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700">
      <table class="table-auto w-full rounded-full dark:text-slate-300">
        <tbody>

<!--          class="flex items-center border-t first:border-none hover:bg-zinc-100 py-2 px-2"-->
        <tr
          class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b dark:border-slate-700"
          v-for="finding in findings"
          :key="finding.uuid"
        >
          <td class="py-2 pl-4 pr-2 w-[1%]">
            <ResultStatusRing class="p-0 m-0 whitespace-normal" :state="finding.status.state?.toLowerCase()"></ResultStatusRing>
          </td>
          <td class="py-3 px-2 whitespace-nowrap grow">{{ finding.title }}</td>
          <td class="py-1 px-2" v-if="configStore.showLabels">
            <LabelList :labels="finding.labels" />
          </td>
          <td class="py-2 px-2 text-right whitespace-nowrap">
            <RouterLink
              class="mr-2 bg-zinc-100 dark:bg-slate-900 hover:bg-zinc-200 dark:hover:bg-slate-800 border dark:border-slate-700 px-4 py-1 rounded-md"
              :to="{ name: 'finding-history', params: { uuid: finding.uuid } }"
            >History
            </RouterLink>
            <RouterLink
              class="bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
              :to="{ name: 'finding-view', params: { id: finding._id } }"
            >View
            </RouterLink>
          </td>
        </tr>
        </tbody>
      </table>
  </div>
<!--    <div class="max-w-full">-->
<!--      <div-->
<!--        class="flex items-center border-t first:border-none hover:bg-zinc-100 py-2 px-2"-->
<!--        v-for="finding in findings"-->
<!--        :key="finding.uuid"-->
<!--      >-->
<!--        <div class="shrink pr-4">-->
<!--          <ResultStatusRing :state="finding.status.state?.toLowerCase()"></ResultStatusRing>-->
<!--        </div>-->
<!--        <div class="flex justify-between grow gap-8 items-center">-->
<!--          <div class="whitespace-nowrap">{{ finding.title }}</div>-->
<!--          <div class="" v-if="configStore.showLabels">-->
<!--            <LabelList :labels="finding.labels" />-->
<!--          </div>-->
<!--        </div>-->
<!--        <div class="flex items-start">-->
<!--          <RouterLink-->
<!--            class="bg-gray-50 hover:bg-gray-200 text-blue-800 border border-blue-800 px-4 py-1 rounded-md text-sm mr-2"-->
<!--            :to="{ name: 'finding-history', params: { uuid: finding.uuid } }"-->
<!--            >History-->
<!--          </RouterLink>-->
<!--          <RouterLink-->
<!--            class="bg-blue-800 hover:bg-clue-700 text-white px-4 py-1 rounded-md text-sm"-->
<!--            :to="{ name: 'finding-view', params: { id: finding._id } }"-->
<!--            >View-->
<!--          </RouterLink>-->
<!--        </div>-->
<!--      </div>-->
<!--    </div>-->
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { FilterParser } from '@/parsers/labelfilter.ts'
import { BIconEyeFill, BIconSearch, BIconFilter as SomeIcon } from 'bootstrap-icons-vue'
import LabelList from '@/components/LabelList.vue'
import type { ChartData } from 'chart.js'
import {
  calculateComplianceOverTimeData,
  type DateDataPoint,
} from '@/parsers/findings.ts'
import ResultComplianceOverTimeChart from '@/components/ResultComplianceOverTimeChart.vue'
import ResultStatusRing from '@/components/ResultStatusRing.vue'
import { type Finding, useFindingsStore } from '@/stores/findings.ts'
import { useHeartbeatsStore } from '@/stores/heartbeats.ts'
import { calculateHeartbeatOverTimeData } from '@/parsers/heartbeats.ts'
import { useConfigStore } from '@/stores/config.ts'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'

const findingsStore = useFindingsStore()
const heartbeatStore = useHeartbeatsStore()
const configStore = useConfigStore()
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
const heartbeatChartData = ref<ChartData<'line', DateDataPoint[]>>({
  labels: [],
  datasets: [],
})

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
  })
  heartbeatStore.overTime().then((response) => {
    heartbeatChartData.value = calculateHeartbeatOverTimeData(response.data)
  })
}

async function save() {
  await router.push({ name: 'dashboards.create', query: { filter: filter.value } })
}

onMounted(() => {
  search()
})
</script>
