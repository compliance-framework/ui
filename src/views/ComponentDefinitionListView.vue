<template>
  <PageHeader>Component Definitions</PageHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  >
    <table class="table-auto w-full rounded-full dark:text-slate-300">
      <tbody>
      <tr
        class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b dark:border-slate-800"
        v-for="componentDefinition in componentDefinitions"
        :key="componentDefinition.uuid"
      >
        <td class="py-3 px-4 whitespace-nowrap grow">{{ componentDefinition.metadata.title }}</td>
        <td class="py-2 px-2 text-right whitespace-nowrap">
          <RouterLink
            class="bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
            :to="{ name: 'component-definition-view', params: { id: componentDefinition.uuid } }"
          >View
          </RouterLink>
        </td>
      </tr>
      </tbody>
    </table>
  </div>

</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { type ComponentDefinition, useComponentDefinitionStore } from '@/stores/component-definitions.ts'

const componentDefinitionStore = useComponentDefinitionStore()

const componentDefinitions = ref<ComponentDefinition[]>([])

onMounted(() => {
  componentDefinitionStore.list().then((data) => {
    componentDefinitions.value = data.data
  })
})
</script>