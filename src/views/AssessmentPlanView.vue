<template>
  <div class="flex gap-8 mt-12">
    <div class="w-1/3 px-2">
      <div class="bg-white rounded shadow">
        <div class="px-4 pt-2">
          <h3 class="text-lg font-semibold text-zinc-600">Compliance over time</h3>
        </div>
        <div class="h-32">
          <LineChart
            :data="chartData"
          ></LineChart>
        </div>
      </div>
    </div>
    <div class="w-1/3 px-2">
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
    </div>
    <div class="w-1/3 px-2">
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
  </div>
  <div class="px-2 mt-8">
    <div class="bg-white rounded shadow px-4 py-2">
      <h3 class="text-lg font-semibold text-zinc-600 mb-4">
        {{ assessmentPlan.title }}
      </h3>
      Results
      <RouterLink
        class="flex border-t items-center hover:bg-zinc-100"
        :to="{ name: 'assessment-plan-result', params: { id: result.id } }"
        v-for="result in results"
        :key="result.id"
      >
        <div class="px-2 py-2">{{ result.title }}</div>
        <div class="px-2 py-2">Findings: {{ result.findings.length }}</div>
        <div class="px-2 py-2">Observations: {{ result.observations.length }}</div>
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
      </RouterLink>
    </div>
  </div>
</template>
<script setup>
import LineChart from '@/components/charts/LineChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import {  onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const assessmentPlan = ref({})
const results = ref([])
const chartData = ref({
  labels: [],
  datasets: []
})

// const chartData = computed({
//   // getter
//   get() {
//     return calculateChart(results)
//   },
// })

function fetchPlan() {
  return fetch(`http://localhost:8080/api/plan/${route.params.id}`).then((response) => {
    return response.json()
  })
}

function fetchResults() {
  return fetch(`http://localhost:8080/api/results/plan/${route.params.id}`).then((response) => {
    return response.json()
  })
}

function calculateChart(results) {
  const labels = []
  const findings = {
    label: 'Findings',
    gradient: {
      backgroundColor: {
        axis: 'y',
        colors: {
          100: 'rgba(253,92,110,0.4)',
          70: 'rgba(253,92,110, .3)',
          30: 'rgba(253,92,110, .1)',
          0: 'rgba(253,92,110, .0)',
        },
      },
    },
    borderColor: 'rgba(253,92,110, 0.7)',
    data: [],
  }
  const observations = {
    label: 'Observations',
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
    borderColor: 'rgba(20,184,166, 0.7)',
    data: [],
  }

  results.forEach((result) => {
    labels.push(result.start)
    findings.data.push(result.findings.length)
    observations.data.push(result.observations.length)
  })

  return {
    labels: labels,
    datasets: [findings, observations],
  }
}

onMounted(() => {
  fetchPlan().then((plan) => {
    assessmentPlan.value = plan
  })
  fetchResults().then((resultsList) => {
    results.value = resultsList.data
    chartData.value = calculateChart(results.value)
  })
})
</script>
