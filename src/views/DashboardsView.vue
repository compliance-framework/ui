<template>
  <PageHeader>Dashboards</PageHeader>
  <PageSubHeader>Findings grouped by query</PageSubHeader>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
    <PageCard v-for="dashboard in dashboards" :key="dashboard.uuid">
      <h3 class="text-lg font-semibold text-zinc-600 dark:text-slate-300">
        {{ dashboard.name }}
      </h3>
      <div class="h-32">
        <DashboardChart :filter="dashboard.filter" />
      </div>
    </PageCard>
  </div>

</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type Dashboard, useDashboardStore } from '@/stores/dashboards.ts'
import DashboardChart from '@/views/DashboardChart.vue'
import ResultComplianceOverTimeChart from '@/components/ResultComplianceOverTimeChart.vue'

const dashboardsStore = useDashboardStore()

const dashboards = ref<Dashboard[]>([])

onMounted(() => {
  dashboardsStore.list().then((data) => {
    dashboards.value = data.data
  })
})
</script>
