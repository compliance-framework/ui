<template>
  <PageHeader>
    Results
  </PageHeader>
  <PageSubHeader>
    Search for results using labels
  </PageSubHeader>
  <div class="grid grid-cols-3 gap-4 mt-4">
    <div class="bg-white rounded shadow">
      <div class="px-4 pt-2">
        <h3 class="text-lg font-semibold text-zinc-600">Compliance over time</h3>
      </div>
      <div class="h-32">
        <LineChart
          :data="{
            labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
              {
                gradient: {
                  backgroundColor: {
                    axis: 'y',
                    colors: {
                      100: 'rgba(30,64,175, .4)',
                      70: 'rgba(30,64,175, .3)',
                      30: 'rgba(30,64,175, .1)',
                      0: 'rgba(30,64,175, .0)',
                    },
                  },
                },
                label: 'Results',
                data: [50, 45, 60, 60, 80, 65, 90, 80, 100],
                borderColor: 'rgba(30,64,175, 0.2)',
              },
            ],
          }"
        ></LineChart>
      </div>
    </div>
    <div class="bg-white rounded shadow">
      <div class="px-4 pt-2">
        <h3 class="text-lg font-semibold text-zinc-600">Agent health</h3>
      </div>
      <div class="h-32">
        <LineChart
          :data="{
            labels: [
              '12:00',
              '13:00',
              '14:00',
              '15:00',
              '16:00',
              '17:00',
              '18:00',
              '19:00',
              '20:00',
            ],
            datasets: [
              {
                gradient: {
                  backgroundColor: {
                    axis: 'y',
                    colors: {
                      100: 'rgba(20,184,166, .4)',
                      70: 'rgba(20,184,166, .3)',
                      30: 'rgba(20,184,166, .1)',
                      0: 'rgba(20,184,166, .0)',
                    },
                  },
                },
                label: 'Health checks complete',
                data: [50, 45, 60, 55, 60, 10, 5, 60, 60],
                borderColor: 'rgba(20,184,166, 0.2)',
              },
            ],
          }"
        ></LineChart>
      </div>
    </div>
    <div class="bg-white rounded shadow">
      <div class="px-4 pt-2">
        <h3 class="text-lg font-semibold text-zinc-600">Compliance over time</h3>
      </div>
      <div class="h-32">
        <BarChart
          :data="{
            labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
              {
                label: 'Results',
                data: [50, 45, 60, 60, 80, 65, 90, 80, 100],
                backgroundColor: 'rgba(99,190,246,0.5)',
              },
            ],
          }"
        ></BarChart>
      </div>
    </div>
  </div>
  <div class="mt-4">
    <PageCard>
      <h3 class="text-lg pl-4 mb-4">Search</h3>
      <div>
        <form @submit.prevent="search">
          <input
            type="text"
            v-model="filter"
            id="filter"
            name="filter"
            placeholder="foo=bar AND bar=baz AND (bar!=bat OR bar!=bat)"
            required
            class="mt-1 w-full rounded-md border-black border px-4 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </form>
      </div>
    </PageCard>
  </div>

  <PageCard class="mt-8">
    <div
      class="grid grid-cols-5 gap-4 border-t first:border-none items-center hover:bg-zinc-100 py-2"
      v-for="result in results"
      :key="result.id"
    >
      <div class="col-span-2 pl-2">{{ result.title }}</div>
      <div>Findings: {{ result.findings.length }}</div>
      <div>Observations: {{ result.observations.length }}</div>
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
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type Result, useApiStore } from '@/stores/api'
import { FilterParser } from '@/parsers/labelfilter.ts'
import BarChart from '@/components/charts/BarChart.vue'
import LineChart from '@/components/charts/LineChart.vue'

const apiStore = useApiStore();
const route = useRoute()

const filter = ref<string>('');
const results = ref<Result[]>([])

async function search() {
  const query = new FilterParser(filter.value).parse();
  const response = await apiStore.searchResults(query);
  results.value = response.data;
}

onMounted(() => {
  search()
})
</script>
