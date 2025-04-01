<template>
  <div
    class="flex items-center border-t first:border-none hover:bg-zinc-100 py-2 px-2"
    v-for="finding in findings"
    :key="finding.uuid"
  >
    <div class="shrink-0 pr-4">
      <ResultStatusRing :state="finding.status.state?.toLowerCase()"></ResultStatusRing>
    </div>
    <div class="w-1/3">{{ finding.title }}</div>
    <div class="flex-wrap grow">
      <LabelList :labels="finding.labels" />
    </div>
    <div>
      <RouterLink
        class="bg-gray-50 hover:bg-gray-200 text-blue-800 border border-blue-800 px-4 py-1 rounded-md text-sm mr-2"
        :to="{ name: 'finding-history', params: { uuid: finding.uuid } }"
      >History
      </RouterLink>
      <RouterLink
        class="bg-blue-800 hover:bg-clue-700 text-white px-4 py-1 rounded-md text-sm"
        :to="{ name: 'finding-view', params: { id: finding._id } }"
      >View
      </RouterLink>
    </div>
  </div>
</template>
<script setup lang="ts">
import LabelList from '@/components/LabelList.vue'
import ResultStatusRing from '@/components/ResultStatusRing.vue'

defineProps(['findings'])
</script>
