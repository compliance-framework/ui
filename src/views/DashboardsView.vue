<template>
  <PageHeader>Dashboards</PageHeader>
  <PageSubHeader>Findings grouped by query</PageSubHeader>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
    <PageCard v-for="dashboard in dashboards" :key="dashboard.uuid" class="p-0">
      <div class="flex justify-between items-center">
        <h3 class="py-2 px-4">
          {{ dashboard.name }}
        </h3>
<!--        <RouterLink-->
<!--          class="bg-gray-50 hover:bg-gray-200 text-blue-800 border border-blue-800 px-4 py-1 rounded-md text-sm mr-2"-->
<!--          :to="{ name: 'findings', query: { filter: dashboard.filter } }"-->
<!--        >History-->
<!--        </RouterLink>-->
      </div>
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

const dashboardsStore = useDashboardStore()

const dashboards = ref<Dashboard[]>([])

onMounted(() => {
  dashboardsStore.list().then((data) => {
    dashboards.value = data.data
  })
})
</script>
