<template>
  <div class="flex mt-24">
    <div class="w-1/2 px-2">
      <div class="bg-white rounded shadow">
        <div class="px-4 pt-2">
          <h3 class="text-base font-semibold text-zinc-600">Compliance over time</h3>
        </div>
        <div class="h-24">
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
                        30: 'rgba(30,64,175, .01)',
                        0: '#fff'
                      }
                    },
                  },
                  label: 'Results',
                  data: [50, 45, 60, 60, 80, 65, 90, 80, 100],
                },
              ],
            }"
          ></LineChart>
        </div>
      </div>
    </div>
    <div class="w-1/2 px-2">
      <div class="bg-white rounded shadow">
        <div class="px-4 pt-2">
          <h3 class="text-base font-semibold text-zinc-600">Agent health</h3>
        </div>
        <div class="h-24">
          <LineChart
            :data="{
              labels: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'],
              datasets: [
                {
                  gradient: {
                    backgroundColor: {
                      axis: 'y',
                      colors: {
                        100: 'rgba(20,184,166, .4)',
                        70: 'rgba(20,184,166, .3)',
                        30: 'rgba(20,184,166, .01)',
                        0: 'rgba(20,184,166, 0)'
                      }
                    },
                  },
                  label: 'Health checks complete',
                  data: [50, 45, 60, 55, 60, 10, 5, 60, 60],
                },
              ],
            }"
          ></LineChart>
        </div>
      </div>
    </div>
  </div>
  <div class="flex mt-4">
    <div class="w-1/2 px-2">
      <div class="bg-white h-72 rounded shadow"></div>
    </div>
    <div class="w-1/4 px-2">
      <div class="bg-white h-32 rounded shadow"></div>
    </div>
    <div class="w-1/4 px-2">
      <div class="bg-white h-32 rounded shadow"></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import LineChart from '@/components/charts/LineChart.vue'
</script>
