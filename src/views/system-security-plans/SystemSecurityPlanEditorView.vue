<template>
  <div>
    <PageHeader>System Security Plan</PageHeader>
    <PageSubHeader>{{ systemSecurityPlan.metadata?.title }}</PageSubHeader>

    <div class="mt-4 text-gray-600 dark:text-slate-400">
      {{ systemSecurityPlan.metadata?.remarks }}
    </div>

    <div class="mt-6 border-b border-ccf-300 dark:border-slate-700">
      <nav class="-mb-px flex space-x-8">
        <RouterLink
          :to="`/system-security-plans/${systemSecurityPlan.uuid}/editor`"
          class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          exact-active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
        >
          Overview
        </RouterLink>
        <RouterLink
          :to="`/system-security-plans/${systemSecurityPlan.uuid}/editor/system-characteristics`"
          class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
        >
          System Characteristics
        </RouterLink>
        <RouterLink
          :to="`/system-security-plans/${systemSecurityPlan.uuid}/editor/system-implementation`"
          class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
        >
          System Implementation
        </RouterLink>
        <RouterLink
          :to="`/system-security-plans/${systemSecurityPlan.uuid}/editor/control-implementation`"
          class="px-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300"
          active-class="border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
        >
          Control Implementation
        </RouterLink>
        <RouterLink
          :to="`/system-security-plans/${systemSecurityPlan.uuid}/json`"
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
  type SystemSecurityPlan,
  useSystemSecurityPlanStore
} from '@/stores/system-security-plans.ts'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
const id = ref<string>(route.params.id as string)
const sspStore = useSystemSecurityPlanStore()
const systemSecurityPlan = ref<SystemSecurityPlan>({} as SystemSecurityPlan)

onMounted(async () => {
  try {
    const response = await sspStore.get(id.value)
    systemSecurityPlan.value = response.data
  } catch (error) {
    console.error('Error loading System Security Plan:', error)
  }
})
</script>
