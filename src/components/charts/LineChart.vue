<script setup lang="ts">
import { Line } from 'vue-chartjs'
import { useCharts } from './chart-defaults'

useCharts()

const props = defineProps(['data', 'options'])
</script>

<template>
  <Line :options="props.options" :data="props.data" />
</template>
