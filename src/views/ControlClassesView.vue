<template>
  <PageHeader>
    All Classes
  </PageHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  >
    <table class="table-auto w-full rounded-full dark:text-slate-300">
      <tbody>
      <tr
        class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b dark:border-slate-800"
        v-for="className in classes"
        :key="className"
      >
        <td class="py-3 px-4 whitespace-nowrap grow">{{ className }}</td>
        <td class="py-2 px-2 text-right whitespace-nowrap">
          <RouterLink
            class="bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
            :to="{name: 'findings-by-class', params: {className}}"
          >View
          </RouterLink>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useFindingsStore } from '@/stores/findings.ts'

const findingsStore = useFindingsStore()

const classes = ref<string[]>([])

onMounted(async () => {
  findingsStore.getAllControlClasses().then((response) => {
    classes.value = response.data
  })
})
</script>
