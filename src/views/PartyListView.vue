<template>
  <PageHeader>Parties</PageHeader>
  <PageSubHeader>Administer parties</PageSubHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <CollapsableGroup v-for="party in parties" :key="party.uuid">
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
        <p>{{ party.remarks}}</p>
      </div>
    </CollapsableGroup>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type Party, usePartyStore } from '@/stores/parties.ts'
import CollapsableGroup from '@/components/CollapsableGroup.vue'

const partyStore = usePartyStore()
const parties = ref<Party[]>([] as Party[]);

onMounted(() => {
  partyStore.list().then((data) => {
    parties.value = data.data
  })
})
</script>
