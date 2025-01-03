<template>
  <div class="mt-16 flex flex-wrap items-start">
    <div class="w-full">
      <div class="py-8 px-4 bg-white rounded shadow">
        <h3 class="text-2xl pl-4">{{ title }}</h3>
      </div>
    </div>
    <div class="w-full lg:w-1/2 px-2">
      <div class="py-8 px-4 bg-white rounded shadow mt-4">
        <h3 class="text-lg pl-4 mb-4">Logs</h3>
        <div>
          <div v-for="log in logs" :key="log.id" class="px-4 py-2 hover:bg-zinc-100">
            <p class="font-semibold">{{ log.title }}</p>
            <p>{{ log.description }}</p>
          </div>
        </div>
      </div>
    </div>
    <div class="w-full lg:w-1/2 px-2 mt-4">
      <div class="py-8 px-4 bg-white rounded shadow">
        <h3 class="text-lg pl-4 mb-4">Findings</h3>
        <div>
          <div v-for="finding in findings" :key="finding.id" class="px-4 py-2 hover:bg-zinc-100">
              <p class="font-semibold">{{ finding.title }}</p>
              <p>{{ finding.description }}</p>
          </div>
        </div>
      </div>
      <div class="py-8 px-4 bg-white rounded shadow mt-4">
        <h3 class="text-lg pl-4 mb-4">Observations</h3>
        <div>
          <div v-for="observation in observations" :key="observation.id" class="px-4 py-2 hover:bg-zinc-100">
            <p class="font-semibold">{{ observation.title }}</p>
            <p>{{ observation.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const title = ref('')
const findings = ref([])
const observations = ref([])
const logs = ref([])
const risks = ref([])

async function fetchResult() {
  return fetch(`http://localhost:8080/api/results/${route.params.id}`)
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
