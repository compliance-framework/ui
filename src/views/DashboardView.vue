<template>
  <div class="flex gap-8 mt-12">
    <div class="w-1/3 px-2">
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
    <div class="bg-white h-72 rounded shadow px-4 py-2">
      <h3 class="text-lg font-semibold text-zinc-600 mb-4">Assessment plans</h3>
      <RouterLink
        class="flex border-t items-center hover:bg-zinc-100"
        :to="{ name: 'assessment-plan', params: { id: assessment.id } }"
        v-for="assessment in assessmentPlans"
        :key="assessment.id"
      >
        <div class="px-2 py-2">{{ assessment.id }}</div>
        <div class="px-2 py-2 flex-1">{{ assessment.title }}</div>
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
import { onMounted, ref } from 'vue'
import BarChart from '@/components/charts/BarChart.vue'

const assessmentPlans = ref([])

onMounted(() => {
  fetch('http://localhost:8080/api/plans')
    .then((response) => {
      return response.json()
    })
    .then((data) => {
      let localData = []
      data.forEach((item) => {
        localData.push({
          id: item._id,
          title: item.title,
        });
      })
      assessmentPlans.value = localData;
    });
})


</script>
