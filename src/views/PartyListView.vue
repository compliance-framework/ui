<template>
  <PageHeader>Parties</PageHeader>
  <PageSubHeader>Administer parties</PageSubHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <template v-if="isLoading">
      <p aria-live="polite" role="status">Loading...</p>
    </template>
    <template v-if="error">
      <p class="text-red-500" aria-live="assertive" role="alert">Error loading parties</p>
    </template>
    <CollapsableGroup v-else v-for="party in parties" :key="party.uuid">
      <template #header>
        <div class="py-2 px-4 flex items-center gap-4">
          <h3>
            {{ party.name }}<span v-if="party.shortName"> - {{ party.shortName }}</span>
            <span
              class="ml-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-gray-800 dark:text-slate-300 rounded-md text-sm whitespace-nowrap px-4 py-1"
            >{{ party.type }}</span>
          </h3>
        </div>
      </template>
      <div class="px-4 py-4 dark:bg-slate-950 border-b border-ccf-300 dark:border-slate-700">
        <p>{{ party.remarks }}</p>
      </div>
    </CollapsableGroup>
  </div>
</template>
<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import type { Party } from '@/stores/types.ts'
import CollapsableGroup from '@/components/CollapsableGroup.vue'
import { useDataApi } from '@/composables/axios'

const { data: parties, isLoading, error } = useDataApi<Party[]>('/api/oscal/parties');
</script>
