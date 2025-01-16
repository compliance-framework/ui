<template>
  <PageHeader>
    Results
  </PageHeader>
  <PageSubHeader>
    Search for results using labels
  </PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4">
    <div class="bg-white rounded shadow">
      <div class="px-4 pt-2">
        <h3 class="text-lg font-semibold text-zinc-600 ">Compliance over time</h3>
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
  <div class="mt-4">
    <PageCard>
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
            <button type="submit" class="flex items-center border-y text-sm border-black bg-white text-black hover:bg-gray-100 p-2"><BIconSearch class="mr-2"></BIconSearch> Search</button>
            <button @click="save" class="bg-blue-800 text-white hover:bg-blue-700 p-3 rounded-r-md"><BIconFloppy></BIconFloppy></button>
          </div>
        </form>
      </div>
    </PageCard>
  </div>

  <PageCard class="mt-8">
    <div
      class="flex items-center border-t first:border-none hover:bg-zinc-100 py-2"
      v-for="result in results"
      :key="result.id"
    >
      <div class="w-1/3">{{ result.title }}</div>
      <div class="w-1/5 flex items-center gap-2">
        <!-- TODO We should integrate the finding status here instead of using observations vs. findings  -->
        <DoughnutChart class="h-6" :options="{responsive: false}" :data="calculateComplianceRatioData([result])"></DoughnutChart>
        <div class="flex gap-2 items-center flex-wrap min-w-32">
          <div>Findings: {{ result.findings.length }}</div>
          <div>Observations: {{ result.observations.length }}</div>
        </div>
      </div>
      <div class="flex-wrap grow">
        <LabelList :labels="viewableLabels(result.labels)" />
      </div>
      <div>
        <RouterLink
          class="bg-gray-50 hover:bg-gray-200 text-blue-800 border border-blue-800 px-4 py-1 rounded-md text-sm mr-2"
          :to="{ name: 'assessment-plan-result-history', params: { stream: result.streamId } }"
        >History
        </RouterLink>
        <RouterLink
          class="bg-blue-800 hover:bg-clue-700 text-white px-4 py-1 rounded-md text-sm"
          :to="{ name: 'assessment-plan-result', params: { id: result._id } }"
        >View
        </RouterLink>
      </div>
      <!--        <div class="px-2 py-2 flex-1">{{ assessment.title }}</div>-->
      <!--        <div class="px-2 w-1/5 h-8">-->
      <!--          <LineChart-->
      <!--            :options="{-->
      <!--              plugins: {-->
      <!--                tooltip: {-->
      <!--                  enabled: false,-->
      <!--                },-->
      <!--              },-->
      <!--              elements: {-->
      <!--                point: {-->
      <!--                  hoverRadius: 0,-->
      <!--                  hitRadius: 0,-->
      <!--                },-->
      <!--              },-->
      <!--            }"-->
      <!--            :data="assessment.data"-->
      <!--          />-->
      <!--        </div>-->
    </div>
  </PageCard>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type LabelMap, type Result, useApiStore } from '@/stores/api'
import { FilterParser } from '@/parsers/labelfilter.ts'
import BarChart from '@/components/charts/BarChart.vue'
import LineChart from '@/components/charts/LineChart.vue'
import DoughnutChart from '@/components/charts/DoughnutChart.vue'
import { BIconFloppy, BIconSearch } from 'bootstrap-icons-vue'
import LabelList from '@/components/LabelList.vue'
import type { ChartData } from 'chart.js'
import {
  calculateAgentUptimeData,
  calculateComplianceOverTimeData,
  calculateComplianceRatioData, type DateDataPoint
} from '@/parsers/results.ts'
import ResultComplianceOverTimeChart from '@/components/ResultComplianceOverTimeChart.vue'

const apiStore = useApiStore();
const router = useRouter()

const filter = ref<string>('');
const results = ref<Result[]>([])
const complianceChartData = ref<ChartData<"line", DateDataPoint[]>>({
  labels: [],
  datasets: [],
})
const uptimeChartData = ref<ChartData<"line", DateDataPoint[]>>({
  labels: [],
  datasets: [],
})

function viewableLabels(labels: LabelMap) {
  const viewable: LabelMap = {};
  for (const label in labels) {
    if (label.substring(0, 1) != "_") {
      viewable[label] = labels[label];
    }
  }
  return viewable;
}

async function search() {
  const query = new FilterParser(filter.value).parse();
  apiStore.searchResults(query).then((response) => {
    results.value = response.data.sort(function(a,b){
      // here a , b is whole object, you can access its property
      //convert both to lowercase
      const x = a.title.toLowerCase();
      const y = b.title.toLowerCase();

      //compare the word which is comes first
      if(x>y){return 1;}
      if(x<y){return -1;}
      return 0;
    });
  });

  apiStore.getComplianceForSearch(query).then((response) => {
    complianceChartData.value = calculateComplianceOverTimeData(response.data);
    uptimeChartData.value = calculateAgentUptimeData(response.data);
  });

  // chartData.value = calculateComplianceChartData(results.value)
  // complianceChartData.value = calculateComplianceRatioData(results.value)
}

async function save() {
  await router.push({ name: 'assessment-plan.create', query: { filter: filter.value } });
}

onMounted(() => {
  search()
})
</script>
