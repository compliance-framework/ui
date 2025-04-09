<template>
  <PageHeader>
    All Subjects
  </PageHeader>
  <PageSubHeader>Manage subject properties</PageSubHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  >
    <table class="table-auto w-full rounded-full dark:text-slate-300 text-left">
      <thead>
        <tr class="border-b dark:border-slate-800">
          <th class="px-4 py-2">Title</th>
          <th class="px-4 py-2">Remarks</th>
          <th class="px-4 py-2">Type</th>
          <th class="px-4 py-2">UUID</th>
          <th class="px-4 py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
      <tr v-for="subject in subjects" :key="subject._id" class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b dark:border-slate-800">
        <td class="py-2 px-4 whitespace-nowrap">{{ subject.title }}</td>
        <td class="py-2 px-4">{{ subject.remarks }}</td>
        <td class="py-2 px-4 whitespace-nowrap w-[1%]">{{ subject.type }}</td>
        <td class="py-2 px-4">{{ subject._id }}</td>
        <td class="py-2 px-4 w-[1%]">
          <router-link :to="{name: 'admin-subject-crud', params: {id: subject._id}}">
            <button class="bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700">
              Manage
            </button>
          </router-link>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { useApiStore, type DataResponse } from '@/stores/api'
import type { Subject } from '@/stores/subjects'
import LabelList from '@/components/LabelList.vue'
import ResultStatusRing from '@/components/ResultStatusRing.vue'
import PageSubHeader from '@/components/PageSubHeader.vue'

const apiStore = useApiStore()

const subjects = ref<Subject[]>([])

onMounted(async () => {
  apiStore.getAllSubjects().then((response: DataResponse<Subject[]>) => {
    subjects.value = response.data || []
  })
})
</script>
