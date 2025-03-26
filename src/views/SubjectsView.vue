<template>
  <PageHeader>
    All Subjects
  </PageHeader>

  <PageCard class="mt-8 w-full">
    <table class="min-w-full table-auto border-collapse">
      <thead>
        <tr class="bg-gray-100">
          <th class="px-6 py-3 text-left text-lg text-gray-600">Title</th>
          <th class="px-6 py-3 text-left text-lg text-gray-600">Remarks</th>
          <th class="px-6 py-3 text-left text-lg text-gray-600">Type</th>
          <th class="px-6 py-3 text-left text-lg text-gray-600">UUID</th>
          <th class="px-6 py-3 text-left text-lg text-gray-600">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="subject in subjects" :key="subject._id" class="border-b hover:bg-gray-50">
          <td class="px-6 py-4 text-gray-800">{{ subject.title }}</td>
          <td class="px-6 py-4 text-gray-800">{{ subject.remarks }}</td>
          <td class="px-6 py-4 text-gray-800">{{ subject.type }}</td>
          <td class="px-6 py-4 text-gray-800">{{ subject._id }}</td>
          <td class="px-6 py-4 text-gray-800">
            <router-link :to="`/subject/${subject._id}`">
              <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                Manage
              </button>
            </router-link>
          </td>
        </tr>
      </tbody>
    </table>
  </PageCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import { useApiStore, type Subject, type DataResponse } from '@/stores/api'

const apiStore = useApiStore()

const subjects = ref<Subject[]>([])

onMounted(async () => {
  apiStore.getAllSubjects().then((response: DataResponse<Subject[]>) => {
    subjects.value = response.data || []
  })
})
</script>
