<template>
  <table class="table-auto w-full rounded-full dark:text-slate-300">
    <tbody>
    <tr
      class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
      v-for="finding in findings"
      :key="finding.uuid"
    >
      <td class="py-2 pl-4 pr-2 w-[1%]">
        <ResultStatusRing
          class="p-0 m-0 whitespace-normal"
          :state="finding.status.state?.toLowerCase()"
        ></ResultStatusRing>
      </td>
      <td class="py-3 px-2 whitespace-nowrap grow">{{ finding.title }}</td>
      <td class="px-2" v-if="configStore.showLabels">
        <LabelList :labels="finding.labels" />
      </td>
      <td class="py-2 px-2 text-right whitespace-nowrap">
        <RouterLink
          class="mr-2 bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 border-ccf-300 dark:border-slate-700"
          :to="{ name: 'finding-history', params: { uuid: finding.uuid } }"
        >History
        </RouterLink>
        <RouterLink
          class="bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 border-ccf-300 dark:border-slate-700"
          :to="{ name: 'finding-view', params: { id: finding._id } }"
        >View
        </RouterLink>
      </td>
    </tr>
    </tbody>
  </table>
</template>
<script setup lang="ts">
import LabelList from '@/components/LabelList.vue'
import ResultStatusRing from '@/components/ResultStatusRing.vue'
import { useConfigStore } from '@/stores/config.ts'

defineProps(['findings'])
const configStore = useConfigStore();
</script>
