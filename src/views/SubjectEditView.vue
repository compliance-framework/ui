<template>
  <PageHeader>
    Subject
  </PageHeader>

  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="updateSubject">
      <div class="mb-4">
        <label class="inline-block pb-2">Title</label>
        <FormInput v-model="form.title" />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2">Remarks</label>
        <FormTextarea v-model="form.remarks" />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2">Type</label>
        <FormInput v-model="form.type" disabled />
      </div>

      <div class="mb-4">
        <label class="inline-block pb-2">UUID</label>
        <FormInput v-model="form._id" disabled />
      </div>

      <div class="text-right">
        <PrimaryButton
          @click.prevent="toggleDeleteModal(true)"
          class="bg-red-500 border-red-600 hover:bg-red-600 text-white dark:bg-red-700 dark:hover:bg-red-600 dark:border-red-700 mr-4">
          Delete Subject
        </PrimaryButton>
        <PrimaryButton type="submit" class="">Save Changes</PrimaryButton>
      </div>
    </form>

  </PageCard>
  <Modal :show="showDeleteModal" @close="toggleDeleteModal(false)" size="sm">
    <div class="px-12 py-8">
      Are you sure you want to delete this subject?
    </div>
    <div class="border-t border-zinc-300 dark:border-slate-700 text-right py-4 px-4">
      <PrimaryButton
        @click="toggleDeleteModal(false)"
        class="mx-2 px-2 py-1 border-zinc-500 border rounded-md shadow"
      >
        Cancel
      </PrimaryButton>
      <PrimaryButton
        @click="deleteSubject"
        class="mx-2 bg-red-500 border-red-600 hover:bg-red-600 text-white dark:bg-red-700 dark:hover:bg-red-600 dark:border-red-700">
        Yes
      </PrimaryButton>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import { useApiStore, type DataResponse } from '@/stores/api'
import type { Subject } from '@/stores/subjects'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import Modal from '@/components/Modal.vue'
const apiStore = useApiStore()
const router = useRouter()

const route = useRoute()
const subjectId = route.params.id as string

const form = ref<Subject>({} as Subject)
const showDeleteModal = ref<boolean>(false);

onMounted(async () => {
  apiStore.getSubjectById(subjectId).then((data: DataResponse<Subject>) => {
    form.value = data.data
  })
})

function toggleDeleteModal(value: boolean) {
  showDeleteModal.value = value
}

const updateSubject = async () => {
  apiStore.patchBySubjectId(subjectId, form.value.title, form.value.remarks).then((subject: DataResponse<Subject>) => {
    console.log('Updated!', subject)
    window.location.reload();
  })
}

async function deleteSubject() {
  try {
    await apiStore.deleteSubjectById(subjectId)
    await router.push({name: 'admin-subjects'})
  } catch (error) {
    console.error('Failed to delete subject:', error)
  }
}
</script>
