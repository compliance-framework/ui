<template>
  <LineChart :data="data" :options="{
             scales: {
              x: {
                type: 'time',
                // bounds: 'data',
                time: {
                  unit: 'minute'
                },

                grid: {
                    display: false
                },
                // ticks: {
                //     source: 'data',
                //     min: '2025-01-13 23:00:00',
                // },
                suggestedMin: '2025-01-01 00:00:00',
                suggestedMax: new Date(),
            },
             } ,
             scale: {
                      grid: {
                          drawBorder: false,
                          display: false,
                          drawOnChartArea: false,
                          drawTicks: false,
                      },
                      border: {
                          display: false,
                      },
                      ticks: {
                          display: false,
                          min: '2025-01-13 23:00:00',
                      },
                      min: '2025-01-13 23:00:00',
                      suggestedMin: '2025-01-13 23:00:00',
                  },

          }"></LineChart>
</template>
<script setup lang="ts">
import LineChart from './charts/LineChart.vue'

defineProps(["data"])
</script>
