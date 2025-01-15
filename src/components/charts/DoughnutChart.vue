<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import { useCharts } from './chart-defaults'

useCharts()

const props = defineProps(['data', 'options'])
</script>

<template>
  <Doughnut :options="props.options" :data="props.data" />
</template>
