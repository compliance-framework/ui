<template>
  <PageHeader>
    Subject
  </PageHeader>

  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="updateSubject">
      <div class="mb-4">
        <label class="block text-gray-700">Title</label>
        <input v-model="form.title" class="w-full p-2 border rounded" />
      </div>

      <div class="mb-4">
        <label class="block text-gray-700">Remarks</label>
        <textarea v-model="form.remarks" class="w-full p-2 border rounded"></textarea>
      </div>

      <div class="mb-4">
        <label class="block text-gray-700">Type</label>
        <input v-model="form.type" class="w-full p-2 border rounded" disabled />
      </div>

      <div class="mb-4">
        <label class="block text-gray-700">UUID</label>
        <input v-model="form.uuid" class="w-full p-2 border rounded" disabled />
      </div>

      <button type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500">Save Changes</button>
    </form>

    <div class="mt-4 text-left">
      <button
        @click="deleteSubject"
        class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-red-500">
        Delete Subject
      </button>
    </div>
  </PageCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import { useApiStore, type Subject, type DataResponse } from '@/stores/api'
const apiStore = useApiStore()
const router = useRouter()

const route = useRoute()
const subjectId = computed(() => route.params.subjectId as string)

const form = ref({
  title: '',
  remarks: '',
  type: '',
  uuid: '',
})

onMounted(async () => {
  apiStore.getSubjectById(subjectId.value).then((subject: DataResponse<Subject>) => {
    form.value = {
      title: subject.data?.title as string,
      remarks: subject.data?.remarks as string,
      type: subject.data.type,
      uuid: subjectId.value
    }
  })
})

const updateSubject = async () => {
  apiStore.patchBySubjectId(subjectId.value, form.value.title, form.value.remarks).then((subject: DataResponse<Subject>) => {
    console.log('Updated!', subject)
    window.location.reload();
  })
}

const deleteSubject = async () => {
  try {
    await apiStore.deleteSubjectById(subjectId.value)
    console.log('Subject deleted successfully')
    router.push('/subjects')
  } catch (error) {
    console.error('Failed to delete subject:', error)
  }
}
</script>
