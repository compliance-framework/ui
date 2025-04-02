<template>
  <PageHeader>
    All Classes
  </PageHeader>

  <PageCard class="mt-8 w-full p-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div
        v-for="className in classes"
        :key="className"
        class="bg-gray-100 p-4 rounded-lg shadow hover:shadow-md transition">
        <p class="text-gray-800 font-medium mb-2">{{ className }}</p>
        <router-link :to="`/findings/by-class/${className}`">
          <button class="bg-blue-800 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
            View controls
          </button>
        </router-link>
      </div>
    </div>
  </PageCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import { useFindingsStore } from '@/stores/findings.ts'

const findingsStore = useFindingsStore()

const classes = ref<string[]>([])

onMounted(async () => {
  findingsStore.getAllControlClasses().then((response) => {
    classes.value = response.data
  })
})
</script>
