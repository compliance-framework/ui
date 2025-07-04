<template>
  <div>
    <PageHeader>Plan of Action and Milestones</PageHeader>
    <PageSubHeader>{{ planOfActionAndMilestones.metadata?.title }}</PageSubHeader>

    <div class="mt-4 text-gray-600 dark:text-slate-400">
      {{ planOfActionAndMilestones.metadata?.remarks }}
    </div>

    <div class="mt-6 border-b border-ccf-300 dark:border-slate-700">
      <nav class="-mb-px flex space-x-8">
        <RouterLink
          :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}`"
          class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          exact-active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
        >
          Overview
        </RouterLink>
        <RouterLink
          :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/poam-items`"
          class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
        >
          POAM Items
        </RouterLink>
        <RouterLink
          :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/roles`"
          class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
        >
          Roles
        </RouterLink>
        <RouterLink
          :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/parties`"
          class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
        >
          Parties
        </RouterLink>
        <RouterLink
          :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/locations`"
          class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
        >
          Locations
        </RouterLink>
        <RouterLink
          :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/back-matter`"
          class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
        >
          Back Matter
        </RouterLink>
        <RouterLink
          :to="`/plan-of-action-and-milestones/${planOfActionAndMilestones.uuid}/json`"
          class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
        >
          JSON View
        </RouterLink>
      </nav>
    </div>

    <div class="mt-6">
      <RouterView v-slot="{ Component }">
        <KeepAlive>
          <component :is="Component" />
        </KeepAlive>
      </RouterView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import {
  type PlanOfActionAndMilestones,
  usePlanOfActionAndMilestonesStore
} from '@/stores/plan-of-action-and-milestones.ts'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
const id = ref<string>(route.params.id as string)
const poamStore = usePlanOfActionAndMilestonesStore()
const planOfActionAndMilestones = ref<PlanOfActionAndMilestones>({} as PlanOfActionAndMilestones)

onMounted(async () => {
  try {
    const response = await poamStore.get(id.value)
    planOfActionAndMilestones.value = response.data
  } catch (error) {
    console.error('Error loading Plan of Action and Milestones:', error)
  }
})
</script> 