<template>
  <PageHeader>Controls of "{{className}}"</PageHeader>

<!--  <div class="mt-4">-->
<!--    <div class="flex gap-4">-->
<!--      <form @submit.prevent="search" class="grow">-->
<!--        <div-->
<!--          class="flex border rounded-md text-zinc-700 dark:text-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700"-->
<!--        >-->
<!--          <div class="pl-4 my-auto">-->
<!--            <BIconSearch-->
<!--              class="mr-2"-->
<!--              height="1.2rem"-->
<!--              width="1.2rem"-->
<!--            ></BIconSearch>-->
<!--          </div>-->
<!--          <input-->
<!--            type="text"-->
<!--            v-model="filter"-->
<!--            id="filter"-->
<!--            name="filter"-->
<!--            placeholder="foo=bar AND bar=baz AND (bar!=bat OR bar!=bat)"-->
<!--            class="grow px-2 py-2 focus:border-none focus-visible:border-none focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:outline-none bg-white dark:bg-slate-900"-->
<!--          />-->
<!--          <SecondaryButton type="submit" class="border-none text-sm">-->
<!--            Search-->
<!--          </SecondaryButton>-->
<!--        </div>-->
<!--      </form>-->
<!--    </div>-->
<!--  </div>-->

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <div v-for="control in controlFindings" :key="control.controlid">
      <CollapsableGroup>
        <template #header>
          <div class="flex items-center gap-4 py-2 px-4">
            <div class="w-1/4">
              <span class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-gray-800 dark:text-slate-300 rounded-md text-sm px-4 py-1 mr-2">{{ control.controlid }}</span>
            </div>
            <div>
              <ResultStatusBadge
                :gray="
                    control.findings.reduce(
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
                    control.findings.reduce(
                      (total, current) =>
                        current.status?.state.toLowerCase() == 'not satisfied'
                          ? total + 1
                          : total,
                      0,
                    )
                  "
                :green="
                    control.findings.reduce(
                      (total, current) =>
                        current.status?.state.toLowerCase() == 'satisfied'
                          ? total + 1
                          : total,
                      0,
                    )
                  "
              ></ResultStatusBadge>
            </div>
          </div>
        </template>
        <div class="px-4">
          <FindingsList :findings="control.findings" />
        </div>
      </CollapsableGroup>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { FilterParser } from '@/parsers/labelfilter.ts'
import { BIconSearch } from 'bootstrap-icons-vue'
import type { ChartData } from 'chart.js'
import {
  calculateComplianceOverTimeData,
  type DateDataPoint,
} from '@/parsers/findings.ts'
import ResultStatusBadge from '@/components/ResultStatusBadge.vue'
import { type FindingsByClassName, useFindingsStore } from '@/stores/findings.ts'
import { useHeartbeatsStore } from '@/stores/heartbeats.ts'
import { calculateHeartbeatOverTimeData } from '@/parsers/heartbeats.ts'
import CollapsableGroup from '@/components/CollapsableGroup.vue'
import FindingsList from '@/views/FindingsList.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'

const findingsStore = useFindingsStore()
const heartbeatStore = useHeartbeatsStore()
const route = useRoute()
const router = useRouter()

const className = computed(() => route.params.className as string)

const filter = ref<string>('')
if (route.query.filter) {
  filter.value = route.query.filter as string
}
const controlFindings = ref<FindingsByClassName[]>()

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

  findingsStore.getByControlClass(className.value).then((response) => {
    controlFindings.value = response.data;
  })

  findingsStore.getComplianceForSearch(query).then((response) => {
    complianceChartData.value = calculateComplianceOverTimeData(response.data)
  })
  heartbeatStore.overTime().then((response) => {
    heartbeatChartData.value = calculateHeartbeatOverTimeData(response.data)
  })
}

onMounted(() => {
  search()
})
</script>
