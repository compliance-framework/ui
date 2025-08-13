<template>
  <PageHeader>Component Definition</PageHeader>
  <template v-if="isLoading">
    <PageSubHeader>Loading component definition...</PageSubHeader>
  </template>
  <template v-else-if="error">
    <PageSubHeader>Error loading component definition</PageSubHeader>
    <p class="mt-4">
      Please check your network connection or try again later.
    </p>
  </template>
  <template v-else-if="componentDefinition">
    <PageSubHeader>{{ componentDefinition.metadata?.title }}</PageSubHeader>

    <p class="mt-4" v-if="componentDefinition.metadata?.remarks">
      {{ componentDefinition.metadata.remarks }}
    </p>

    <div class="mt-4 border-b border-ccf-300 dark:border-slate-800 overflow-x-auto whitespace-nowrap">
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{name: 'component-definition-overview', params: {id: componentDefinition.uuid}}"
      >
        Overview
      </RouterLink>
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{name: 'component-definition-import-definitions', params: {id: componentDefinition.uuid}}"
      >
        Import Definitions
      </RouterLink>
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{name: 'component-definition-components', params: {id: componentDefinition.uuid}}"
      >
        Components
      </RouterLink>
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{name: 'component-definition-capabilities', params: {id: componentDefinition.uuid}}"
      >
        Capabilities
      </RouterLink>
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{name: 'component-definition-back-matter', params: {id: componentDefinition.uuid}}"
      >
        Back Matter
      </RouterLink>
      <RouterLink
        class="px-4 py-2 inline-block text-lg border-ccf-300 dark:border-slate-700 dark:hover:bg-slate-900"
        :to="{name: 'component-definition-json', params: {id: componentDefinition.uuid}}"
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import PageHeader from '@/components/PageHeader.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import type { ComponentDefinition } from '@/stores/component-definitions.ts'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useDataApi } from '@/composables/axios'
import type { AxiosError } from 'axios'
import type { ErrorResponse, ErrorBody } from '@/stores/types'
import { useToast } from 'primevue/usetoast'

const toast = useToast();
const route = useRoute()
const router = useRouter();
const id = ref<string>(route.params.id as string)

const { data: componentDefinition, isLoading, error } = useDataApi<ComponentDefinition>(
  `/api/oscal/component-definitions/${id.value}`
)
watch(error, () => {
  if (error.value) {
    const errorResponse = error.value as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error loading component definition',
      detail: `Failed to load component definition: ${errorResponse.response?.data.errors.body || 'Unknown error'}. Please check your network connection and try again.`,
      life: 3000
    });
    router.push({ name: 'component-definitions' });
  }
});

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
