<template>
  <PageHeader>System Security Plan</PageHeader>
  <PageSubHeader>{{ systemSecurityPlan.metadata?.title }}</PageSubHeader>

  <p class="mt-4" v-if="systemSecurityPlan.metadata?.remarks">
    {{ systemSecurityPlan.metadata.remarks }}
  </p>

  <div class="mt-4 border-b border-ccf-300 dark:border-slate-800 overflow-x-auto whitespace-nowrap">
    <RouterLink 
      class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900" 
      :to="{name: 'system-security-plan-overview', params: {id: id}}"
    >
      Overview
    </RouterLink>
    <RouterLink 
      class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900" 
      :to="{name: 'system-security-plan-characteristics', params: {id: id}}"
    >
      System Characteristics
    </RouterLink>
    <RouterLink 
      class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900" 
      :to="{name: 'system-security-plan-system-implementation', params: {id: id}}"
    >
      System Implementation
    </RouterLink>
    <RouterLink 
      class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900" 
      :to="{name: 'system-security-plan-control-implementation', params: {id: id}}"
    >
      Control Implementation
    </RouterLink>
    <RouterLink 
      class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900" 
      :to="{name: 'system-security-plan-json', params: {id: id}}"
    >
      JSON
    </RouterLink>
  </div>

  <div class="my-4">
    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, toValue } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type SystemSecurityPlan, useSystemSecurityPlanStore } from '@/stores/system-security-plans.ts'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
const id = ref<string>(route.params.id as string)
const systemSecurityPlanStore = useSystemSecurityPlanStore()
const systemSecurityPlan = ref<SystemSecurityPlan>({} as SystemSecurityPlan)

onMounted(() => {
  systemSecurityPlanStore.get(toValue(id)).then((data) => {
    systemSecurityPlan.value = data.data
  })
})
</script>

<style scoped>
.router-link-exact-active {
  background: none;
  border-bottom: 2px solid;
}

.dark .router-link-exact-active {
  background-color: rgb(15 23 42); /* slate-900 */
}
</style>