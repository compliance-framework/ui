<template>
  <PageHeader>Assessment Plans</PageHeader>

  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <table class="table-auto w-full rounded-full dark:text-slate-300">
      <tbody>
      <tr
        class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800"
        v-for="assessmentPlan in assessmentPlans"
        :key="assessmentPlan.uuid"
      >
        <td class="py-3 px-4 whitespace-nowrap grow">{{ assessmentPlan.metadata.title }}</td>
        <td class="py-2 px-2 text-right whitespace-nowrap">
          <div class="flex gap-2">
            <RouterLink
              class="bg-white hover:bg-zinc-100 border border-ccf-300 px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
              :to="{ name: 'assessment-plan-overview', params: { id: assessmentPlan.uuid } }"
            >View
            </RouterLink>
            <button
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md"
              @click="downloadJSON(assessmentPlan.uuid, assessmentPlan.metadata.title)"
              title="Download Full JSON"
            >JSON
            </button>
          </div>
        </td>
      </tr>
      </tbody>
    </table>
  </div>

  <div class="mt-4">
    <RouterLink
      class="bg-transparent font-light hover:bg-zinc-100 dark:text-slate-300 dark:hover:bg-slate-800 border border-ccf-300 dark:border-slate-700 px-4 py-1 rounded-md"
      :to="{ name: 'assessment-plan-create' }"
    >Create Assessment Plan
    </RouterLink>
  </div>

</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { type AssessmentPlan, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import { useToast } from 'primevue/usetoast'

const assessmentPlanStore = useAssessmentPlanStore()
const toast = useToast()

const assessmentPlans = ref<AssessmentPlan[]>([])

onMounted(() => {
  assessmentPlanStore.list().then((data) => {
    assessmentPlans.value = data.data
  })
})

async function downloadJSON(id: string, title: string) {
  try {
    const response = await assessmentPlanStore.full(id)
    const jsonData = JSON.stringify(response.data, null, 2)

    // Create blob and download
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}-assessment-plan.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.add({
      severity: 'success',
      summary: 'JSON Downloaded',
      detail: `Assessment plan JSON downloaded successfully`,
      life: 3000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Download Failed',
      detail: 'Failed to download assessment plan JSON',
      life: 3000
    })
  }
}
</script>
