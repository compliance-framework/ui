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

ChartJS.defaults.set({
  plugins: {
    gradient,
    legend: {
      display: false,
    },
  },
  layout: {
    autoPadding: false,
    padding: {
      top: 4
    },
  },
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0,
  },
  interaction: {
    intersect: false,
    mode: 'index',
  },
  elements: {
    point: {
      radius: 0,
      hitRadius: 1,
      hoverRadius: 2,
    },
    line: {
      tension: 0.4,
      borderWidth: 1,
      fill: true,
    }
  },
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
    }
  }
});

const props = defineProps(['id', 'data', 'options', 'style'])
</script>

<template>
  <Line :options="props.options" :data="props.data" class="-mx-1 overflow-hidden h-full" />
</template>
