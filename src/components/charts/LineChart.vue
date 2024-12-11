<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler,
} from 'chart.js'
import gradient from 'chartjs-plugin-gradient'
import { ref } from 'vue'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  Filler,
  PointElement,
  LineElement,
  CategoryScale,
  LinearScale,
  gradient,
)

const props = defineProps(['id', 'data', 'options', 'style'])

const optionData = ref({
  ...{
    plugins: {
      gradient,
      legend: {
        display: false,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    hoverBorderJoinStyle: 'round',
    layout: {
      autoPadding: false,
      padding: {
        top: 4
      },
    },
    animation: {
      duration: 0,
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      point: {
        radius: 1,
        hitRadius: 12,
      },
      line: {
        tension: 0.4,
        borderWidth: 1,
        fill: true,
      },
    },
    scales: {
      y: {
        grid: {
          drawBorder: false,
          display: false,
          drawOnChartArea: false,
          drawTicks: false,
        },
        ticks: {
          display: false,
        },
      },
      x: {
        grid: {
          drawBorder: false,
          display: false,
          drawOnChartArea: false,
          drawTicks: false,
        },
        ticks: {
          display: false,
        },
      },
    },
  },
  ...props.options,
})
</script>

<template>
  <Line :options="optionData" :data="data" class="-mx-0.5 overflow-auto h-full" />
</template>
