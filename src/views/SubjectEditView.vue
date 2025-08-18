<template>
  <PageHeader> Subject </PageHeader>

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
        <Button
          label="Delete Subject"
          @click.prevent="confirmSave()"
          class="!bg-red-500 border-red-600 hover:bg-red-600 text-white dark:bg-red-700 dark:hover:bg-red-600 dark:border-red-700 mr-4"
        >
          Delete Subject
        </Button>
        <Button type="submit" class="">Save Changes</Button>
      </div>
    </form>
  </PageCard>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import { useApiStore, type DataResponse } from '@/stores/api';
import type { Subject } from '@/stores/subjects';
import FormInput from '@/components/forms/FormInput.vue';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';

import Button from '@/volt/Button.vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

const apiStore = useApiStore();
const router = useRouter();
const confirm = useConfirm();
const toast = useToast();

const route = useRoute();
const subjectId = route.params.id as string;

const form = ref<Subject>({} as Subject);
const showDeleteModal = ref<boolean>(false);

onMounted(async () => {
  apiStore.getSubjectById(subjectId).then((data: DataResponse<Subject>) => {
    form.value = data.data;
  });
});

function confirmSave() {
  confirm.require({
    message: 'Are you sure you want to delete this subject?',
    header: 'Delete Subject',
    rejectProps: {
      label: 'Cancel',
    },
    acceptProps: {
      label: 'Yes',
      severity: 'danger',
    },
    accept: () => {
      deleteSubject();
    },
    reject: () => {
      toast.add({
        severity: 'info',
        summary: 'Cancelled',
        detail: 'Subject deletion cancelled',
        life: 3000,
      });
    },
  });
}

const updateSubject = async () => {
  apiStore
    .patchBySubjectId(
      subjectId,
      form.value.title as string,
      form.value.remarks as string,
    )
    .then((subject: DataResponse<Subject>) => {
      window.location.reload();
    });
};

async function deleteSubject() {
  try {
    await apiStore.deleteSubjectById(subjectId);
    await router.push({ name: 'admin-subjects' });
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Subject deleted successfully',
      life: 3000,
    });
  } catch (error) {
    console.error('Failed to delete subject:', error);
  }
}
</script>
