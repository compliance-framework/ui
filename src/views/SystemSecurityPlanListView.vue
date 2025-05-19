<template>
  <PageHeader>System Security Plans</PageHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  >
    <table class="table-auto w-full rounded-full dark:text-slate-300">
      <tbody>
      <tr
        class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b dark:border-slate-800"
        v-for="ssp in systemSecurityPlans"
        :key="ssp.uuid"
      >
        <td class="py-3 px-4 whitespace-nowrap grow">{{ ssp.metadata.title }}</td>
        <td class="py-2 px-2 text-right whitespace-nowrap">
          <RouterLink
            class="bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
            :to="{ name: 'system-security-plans-editor', params: { id: ssp.uuid } }"
          >View
          </RouterLink>
        </td>
      </tr>
      </tbody>
    </table>
  </div>

  <div class="mt-4">
    <RouterLink
      class="bg-transparent font-light hover:bg-zinc-100 dark:text-slate-300 dark:hover:bg-slate-800 border dark:border-slate-700 px-4 py-1 rounded-md"
      :to="{ name: 'system-security-plans-create' }"
    >Create Catalog
    </RouterLink>
  </div>

</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { type SystemSecurityPlan, useSystemSecurityPlanStore } from '@/stores/system-security-plans.ts'

const sspStore = useSystemSecurityPlanStore()

const systemSecurityPlans = ref<SystemSecurityPlan[]>([])

onMounted(() => {
  sspStore.list().then((data) => {
    systemSecurityPlans.value = data.data
  })
})
</script>
