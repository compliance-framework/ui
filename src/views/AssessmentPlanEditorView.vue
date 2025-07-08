<template>
  <PageHeader>Assessment Plan</PageHeader>
  <PageSubHeader>{{ assessmentPlan.metadata?.title }}</PageSubHeader>

  <p class="mt-4" v-if="assessmentPlan.metadata?.remarks">
    {{ assessmentPlan.metadata.remarks }}
  </p>

  <div class="mt-4 border-b border-ccf-300 dark:border-slate-800">
    <RouterLink
      class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
      :to="{name: 'assessment-plan-overview', params: {id: assessmentPlan.uuid}}"
    >
      Overview
    </RouterLink>
    <RouterLink
      class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
      :to="{name: 'assessment-plan-tasks', params: {id: assessmentPlan.uuid}}"
    >
      Tasks
    </RouterLink>
    <RouterLink
      class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
      :to="{name: 'assessment-plan-activities', params: {id: assessmentPlan.uuid}}"
    >
      Activities
    </RouterLink>
    <RouterLink
      class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
      :to="{name: 'assessment-plan-subjects', params: {id: assessmentPlan.uuid}}"
    >
      Subjects
    </RouterLink>
    <RouterLink
      class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
      :to="{name: 'assessment-plan-assets', params: {id: assessmentPlan.uuid}}"
    >
      Assets
    </RouterLink>
    <RouterLink
      class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
      :to="{name: 'assessment-plan-json', params: {id: assessmentPlan.uuid}}"
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
import { type AssessmentPlan, useAssessmentPlanStore } from '@/stores/assessment-plans.ts'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
const id = ref<string>(route.params.id as string)
const assessmentPlanStore = useAssessmentPlanStore()
const assessmentPlan = ref<AssessmentPlan>({} as AssessmentPlan)

onMounted(() => {
  assessmentPlanStore.get(toValue(id)).then((data) => {
    assessmentPlan.value = data.data
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
