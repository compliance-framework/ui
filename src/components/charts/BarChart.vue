<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { useCharts } from './chart-defaults'

useCharts()

const props = defineProps(['data', 'options'])
</script>

<template>
  <Bar :options="props.options" :data="props.data" />
</template>
