<template>
  <PageHeader>
    Assessment Plans
  </PageHeader>
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
  <PageCard class="mt-8">
    <div>
      <div
        class="grid grid-cols-2 gap-4 border-t first:border-none hover:bg-zinc-100 py-2"
        v-for="assessment in assessmentPlans"
        :key="assessment.id"
      >
  <!--      <div class="px-2 py-2">{{ assessment.id }}</div>-->
        <div class="pl-4">{{ assessment.title }}</div>
        <div>
          <RouterLink
            class="bg-blue-800 hover:bg-clue-700 text-white px-4 py-1 rounded-md text-sm inline-block"
            :to="{ name: 'assessment-plan.view', params: { id: assessment.id } }"
          >View</RouterLink>
        </div>
      </div>
    </div>
    <div class="mt-4">
      <RouterLink
        class="bg-gray-50 border border-blue-800 hover:bg-gray-200 text-blue-800 px-4 py-2 rounded inline-block"
        :to="{ name: 'assessment-plan.create' }"
      >Create</RouterLink>
    </div>
  </PageCard>
</template>
<script setup>
import LineChart from '@/components/charts/LineChart.vue'
import { onMounted, ref } from 'vue'
import BarChart from '@/components/charts/BarChart.vue'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'

const assessmentPlans = ref([])

onMounted(() => {
  fetch('http://localhost:8080/api/plans')
    .then((response) => {
      return response.json()
    })
    .then((data) => {
      const localData = []
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
