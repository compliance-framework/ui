<template>
  <PageHeader>
    {{ title }}
  </PageHeader>
  <PageSubHeader>
    {{ id }}
  </PageSubHeader>
  <div class="grid grid-cols-2 gap-4 mt-4">
    <PageCard>
      <h3 class="text-lg pl-4 mb-4">Observations</h3>
      <div>
        <div
          v-for="observation in observations"
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
        <div v-for="finding in findings" :key="finding.id" class="px-4 py-2 hover:bg-zinc-100">
          <p class="font-semibold">{{ finding.title }}</p>
          <p>{{ finding.description }}</p>
        </div>
      </div>
    </PageCard>
    <PageCard>
      <h3 class="text-lg pl-4 mb-4">Logs</h3>
      <div>
        <div v-for="log in logs" :key="log.id" class="px-4 py-2 hover:bg-zinc-100">
          <p class="font-semibold">{{ log.title }}</p>
          <p>{{ log.description }}</p>
        </div>
      </div>
    </PageCard>
  </div>
</template>
<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { useConfigStore } from '@/stores/config';

const configStore = useConfigStore();
const route = useRoute()
const id = ref(route.params.id)
const title = ref('')
const findings = ref([])
const observations = ref([])
const logs = ref([])
const risks = ref([])

async function fetchResult() {
  const config = await useConfigStore().getConfig();
  return fetch(`${config.API_URL}/api/results/${id.value}`)
    .then((response) => {
      return response.json()
    })
    .then((json) => {
      return json.data
    })
}

onMounted(() => {
  fetchResult().then((result) => {
    if (result) {
      console.log(result)
      title.value = result.title
      findings.value = result.findings
      observations.value = result.observations
      logs.value = result.assessmentLogEntries
      console.log(result)
    }
  })
})
</script>
