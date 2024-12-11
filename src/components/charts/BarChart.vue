<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

defineProps([
  'id',
  'title',
  'data',
  'options',
])
</script>

<template>
  <Bar
    id="my-chart-id"
    :options="options"
    :data="data"
  />
</template>
