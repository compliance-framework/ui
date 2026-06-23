<template>
  <template v-if="isLoading">
    <div class="px-6 py-4 text-center text-gray-500 dark:text-slate-400">
      Loading...
    </div>
  </template>
  <template v-else-if="group">
    <PageHeader>Group: {{ group.name }}</PageHeader>
    <div class="flex flex-col md:flex-row gap-4 pt-10">
      <PageCard class="md:w-1/3">
        <div class="p-4">
          <h2 class="text-lg font-semibold mb-4 dark:text-slate-200">
            Group Details
          </h2>
          <p><strong>ID:</strong> {{ group.id }}</p>
          <p><strong>Name:</strong> {{ group.name }}</p>
          <p>
            <strong>Description:</strong>
            {{ group.description ?? '—' }}
          </p>
          <p v-if="group.createdAt">
            <strong>Created:</strong> {{ formatDate(group.createdAt) }}
          </p>
          <p v-if="group.updatedAt">
            <strong>Updated:</strong> {{ formatDate(group.updatedAt) }}
          </p>
        </div>
      </PageCard>

      <PageCard class="flex-grow">
        <div class="p-4">
          <GroupMembersPanel :groupId="group.id" />
        </div>
      </PageCard>
    </div>

    <div class="mt-4">
      <PrimaryButton class="mr-2" @click="editVisible = true"
        >Edit Group</PrimaryButton
      >
      <PrimaryButton @click="deleteGroup">Delete Group</PrimaryButton>
    </div>

    <Dialog modal header="Edit Group" v-model:visible="editVisible">
      <GroupEditForm
        :group="group"
        @saved="onSaved"
        @cancel="editVisible = false"
      />
    </Dialog>
  </template>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageCard from '@/components/PageCard.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import Dialog from '@/volt/Dialog.vue';
import GroupMembersPanel from '@/components/groups/GroupMembersPanel.vue';
import GroupEditForm from '@/components/groups/GroupEditForm.vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { useDataApi, useAuthenticatedInstance } from '@/composables/axios';
import type { CCFGroup, ErrorBody, ErrorResponse } from '@/stores/types';
import type { AxiosError } from 'axios';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const {
  data: group,
  isLoading,
  error,
} = useDataApi<CCFGroup>(`/api/admin/groups/${route.params.id}`);

const axiosInstance = useAuthenticatedInstance();
const editVisible = ref(false);

watch(error, (err) => {
  if (!err) return;
  const errorResponse = err as AxiosError<ErrorResponse<ErrorBody>>;
  toast.add({
    severity: 'error',
    summary: 'Error loading group',
    detail:
      errorResponse.response?.data.errors.body ??
      'An error occurred while loading the group.',
    life: 3000,
  });
  router.push({ name: 'admin-groups' });
});

function onSaved(updated: CCFGroup) {
  editVisible.value = false;
  group.value = updated;
  toast.add({ severity: 'success', summary: 'Group updated', life: 3000 });
}

function deleteGroup() {
  if (!group.value) return;
  confirm.require({
    message: `Are you sure you want to delete group "${group.value.name}"? This action cannot be undone.`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary' },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await axiosInstance.delete(`/api/admin/groups/${route.params.id}`);
        toast.add({
          severity: 'success',
          summary: 'Group deleted',
          detail: `Group "${group.value?.name}" has been deleted.`,
          life: 3000,
        });
        router.push({ name: 'admin-groups' });
      } catch (error) {
        const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
        toast.add({
          severity: 'error',
          summary: 'Error deleting group',
          detail:
            errorResponse.response?.data.errors.body ?? 'An error occurred.',
          life: 3000,
        });
      }
    },
  });
}

function formatDate(date?: string | Date | null): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>
