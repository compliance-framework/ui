<template>
  <div v-if="isLoading" class="text-center py-12">
    <i class="pi pi-spin pi-spinner text-4xl text-gray-400"></i>
    <p class="mt-4 text-gray-500 dark:text-slate-400">Loading...</p>
  </div>
  <div v-else-if="group">
    <div class="flex justify-between items-center mb-6">
      <div>
        <PageHeader>{{ group.name }}</PageHeader>
        <PageSubHeader>Group details and members</PageSubHeader>
      </div>
      <div class="flex gap-2">
        <SecondaryButton @click="editVisible = true">
          <i class="pi pi-pencil mr-2"></i>
          Edit
        </SecondaryButton>
        <SecondaryButton severity="danger" @click="deleteGroup">
          <i class="pi pi-trash mr-2"></i>
          Delete
        </SecondaryButton>
      </div>
    </div>

    <div class="flex flex-col md:flex-row gap-4 items-start">
      <PageCard class="md:w-1/3">
        <h2 class="text-lg font-semibold mb-4 dark:text-slate-200">
          Group Details
        </h2>
        <dl class="space-y-3 text-sm">
          <div>
            <dt class="text-gray-500 dark:text-slate-400">ID</dt>
            <dd class="font-medium dark:text-slate-200 break-all">
              {{ group.id }}
            </dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-slate-400">Name</dt>
            <dd class="font-medium dark:text-slate-200">{{ group.name }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-slate-400">Description</dt>
            <dd class="font-medium dark:text-slate-200">
              {{ group.description ?? '—' }}
            </dd>
          </div>
          <div v-if="group.createdAt">
            <dt class="text-gray-500 dark:text-slate-400">Created</dt>
            <dd class="font-medium dark:text-slate-200">
              {{ formatDate(group.createdAt) }}
            </dd>
          </div>
          <div v-if="group.updatedAt">
            <dt class="text-gray-500 dark:text-slate-400">Updated</dt>
            <dd class="font-medium dark:text-slate-200">
              {{ formatDate(group.updatedAt) }}
            </dd>
          </div>
        </dl>
      </PageCard>

      <PageCard class="flex-grow">
        <GroupMembersPanel :groupId="group.id" />
      </PageCard>
    </div>

    <Dialog
      modal
      header="Edit Group"
      :draggable="false"
      v-model:visible="editVisible"
    >
      <GroupEditForm
        :group="group"
        @saved="onSaved"
        @cancel="editVisible = false"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import PageCard from '@/components/PageCard.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
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
