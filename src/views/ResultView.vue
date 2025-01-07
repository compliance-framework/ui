<template>
  <PageHeader>
    {{ result?.title }}
  </PageHeader>
  <PageSubHeader>
    {{ result?._id }}
  </PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4">
    <PageCard>
      <h3 class="text-lg pl-4 mb-4">Observations</h3>
      <div>
        <div
          v-for="observation in result?.observations"
          :key="observation.id"
          class="px-4 py-2 hover:bg-zinc-100"
        >
          <p class="font-semibold">{{ observation.title }}</p>
          <p>{{ observation.description }}</p>
        </div>
      </div>
    </PageCard>
    <PageCard>
      <h3 class="text-lg pl-4 mb-4">Findings</h3>
      <div>
        <div v-for="finding in result?.findings" :key="finding.id" class="px-4 py-2 hover:bg-zinc-100">
          <p class="font-semibold">{{ finding.title }}</p>
          <p>{{ finding.description }}</p>
        </div>
      </div>
    </PageCard>
    <PageCard>
      <h3 class="text-lg pl-4 mb-4">Logs</h3>
      <div>
        <div v-for="log in result?.assessmentLogEntries" class="px-4 py-2 hover:bg-zinc-100">
          <p class="font-semibold">{{ log.title }}</p>
          <p>{{ log.description }}</p>
        </div>
      </div>
    </PageCard>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type Result, useApiStore } from '@/stores/api'

const apiStore = useApiStore();
const route = useRoute()
const id = route.params.id as string

const result = ref<Result>({} as Result)

onMounted(() => {
  apiStore.getResult(id).then((res) => {
    result.value = res.data
  })
})
</script>
