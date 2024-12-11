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
      <div
        class="flex border-t items-center hover:bg-zinc-100"
        v-for="assessment in assessmentPlans"
        :key="assessment.id"
      >
        <div class="px-2 py-2">{{ assessment.id }}</div>
        <div class="px-2 py-2 flex-1">{{ assessment.name }}</div>
        <div class="px-2 w-1/5 h-8">
          <LineChart
            :options="{
              plugins: {
                tooltip: {
                  enabled: false,
                },
              },
              elements: {
                point: {
                  hoverRadius: 0,
                  hitRadius: 0,
                },
              },
            }"
            :data="assessment.data"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import LineChart from '@/components/charts/LineChart.vue'
import { ref } from 'vue'
import BarChart from '@/components/charts/BarChart.vue'

const gradientConfiguration = {
  backgroundColor: {
    axis: 'y',
    colors: {
      100: 'rgba(20,184,166, .7)',
      // 35: 'rgba(20,184,166, .7)',
      10: 'rgba(20,184,166, .3)',
      0: 'rgba(20,184,166, 0.0)',
    },
  },
}

const assessmentPlans = ref([
  {
    id: '848DE83F-5D02-49E3-A7D4-F6612486CC5C',
    name: 'Public facing Kubernetes host SSH Security',
    data: {
      labels: ['12:00', '13:00', '14:00', '15:00', '14:00', '15:00', '16:00'],
      datasets: [
        {
          gradient: gradientConfiguration,
          data: [0, 20, 10, 8, 4, 10, 0],
          borderColor: 'rgba(20,184,166, 0.2)',
        },
      ],
    },
  },
  {
    id: 'AAE3A4A9-C3F0-44B6-86FD-6ACB03B84E62',
    name: 'Public facing Kubernetes Firewall Security',
    data: {
      labels: ['12:00', '13:00', '14:00', '15:00', '14:00', '15:00', '16:00'],
      datasets: [
        {
          gradient: gradientConfiguration,
          data: [0, 20, 10, 8, 4, 10, 0],
          borderColor: 'rgba(20,184,166, 0.2)',
        },
      ],
    },
  },
  {
    id: 'C3ECD77D-ED33-48CA-A674-78AF707223EE',
    name: 'Postgres access security',
    data: {
      labels: ['12:00', '13:00', '14:00', '15:00', '14:00', '15:00', '16:00'],
      datasets: [
        {
          gradient: gradientConfiguration,
          data: [0, 10, 15, 8, 15, 10, 15],
          borderColor: 'rgba(20,184,166, 0.2)',
        },
        {
          gradient: {
            backgroundColor: {
              axis: 'y',
              colors: {
                100: 'rgba(184,69,20,0.4)',
                10: 'rgba(184,69,20, .3)',
                0: 'rgba(184,69,20, 0.0)',
              },
            },
          },
          data: [0, 25, 10, 10, 25, 5, 8],
          borderColor: 'rgba(184,69,20, 0.2)',
        },
      ],
    },
  },
  {
    id: 'C3ECD77D-F9F3-4D96-9740-3BAE64E4998E',
    name: 'Azure VM Configuration - Tags and Security Groups',
    data: {
      labels: ['12:00', '13:00', '14:00', '15:00', '14:00', '15:00', '16:00'],
      datasets: [
        {
          gradient: gradientConfiguration,
          data: [0, 10, 20, 0, 30, 0, 25],
          borderColor: 'rgba(20,184,166, 0.2)',
        },
      ],
    },
  },
])
</script>
