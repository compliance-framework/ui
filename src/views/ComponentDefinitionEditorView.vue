<template>
  <PageHeader>Component Definition</PageHeader>
  <PageSubHeader>{{ componentDefinition.metadata?.title }}</PageSubHeader>

  <p class="mt-4" v-if="componentDefinition.metadata?.remarks">
    {{ componentDefinition.metadata.remarks }}
  </p>

  <div class="mt-4 border-b dark:border-slate-800">
    <RouterLink 
      class="px-4 py-2 inline-block text-lg border-slate-600 dark:border-slate-700 dark:hover:bg-slate-900" 
      :to="{name: 'component-definition-overview', params: {id: componentDefinition.uuid}}"
    >
      Overview
    </RouterLink>
    <RouterLink 
      class="px-4 py-2 inline-block text-lg border-slate-600 dark:border-slate-700 dark:hover:bg-slate-900" 
      :to="{name: 'component-definition-import-definitions', params: {id: componentDefinition.uuid}}"
    >
      Import Definitions
    </RouterLink>
    <RouterLink 
      class="px-4 py-2 inline-block text-lg border-slate-600 dark:border-slate-700 dark:hover:bg-slate-900" 
      :to="{name: 'component-definition-components', params: {id: componentDefinition.uuid}}"
    >
      Components
    </RouterLink>
    <RouterLink 
      class="px-4 py-2 inline-block text-lg border-slate-600 dark:border-slate-700 dark:hover:bg-slate-900" 
      :to="{name: 'component-definition-capabilities', params: {id: componentDefinition.uuid}}"
    >
      Capabilities
    </RouterLink>
    <RouterLink 
      class="px-4 py-2 inline-block text-lg border-slate-600 dark:border-slate-700 dark:hover:bg-slate-900" 
      :to="{name: 'component-definition-back-matter', params: {id: componentDefinition.uuid}}"
    >
      Back Matter
    </RouterLink>
  </div>

  <div class="mt-4">
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
import { type ComponentDefinition, useComponentDefinitionStore } from '@/stores/component-definitions.ts'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
const id = ref<string>(route.params.id as string)
const componentDefinitionStore = useComponentDefinitionStore()
const componentDefinition = ref<ComponentDefinition>({} as ComponentDefinition)

onMounted(() => {
  componentDefinitionStore.get(toValue(id)).then((data) => {
    componentDefinition.value = data.data
  })
})
</script>

<style scoped>
.router-link-exact-active {
  @apply bg-none border-b-2 dark:bg-slate-900
}
</style>