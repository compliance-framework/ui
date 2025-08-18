<template>
  <template v-if="loading">
    <div class="px-6 py-4 text-center text-gray-500 dark:text-slate-400">
      Loading...
    </div>
  </template>
  <template v-else-if="user">
    <PageHeader
      >Viewing user: {{ user.firstName }} {{ user.lastName }}</PageHeader
    >
    <div class="flex flex-col md:flex-row gap-4 pt-10">
      <PageCard class="flex-grow">
        <div class="p-4">
          <h2 class="text-lg font-semibold mb-4">User Details</h2>
          <p><strong>ID:</strong> {{ user.id }}</p>
          <p><strong>Email:</strong> {{ user.email }}</p>
          <p><strong>First Name:</strong> {{ user.firstName }}</p>
          <p><strong>Last Name:</strong> {{ user.lastName }}</p>
        </div>
      </PageCard>
      <PageCard class="flex-grow">
        <div class="p-4">
          <h2 class="text-lg font-semibold mb-4">User Metadata</h2>
          <p><strong>Created At:</strong> {{ formatDate(user.createdAt) }}</p>
          <p><strong>Updated At:</strong> {{ formatDate(user.updatedAt) }}</p>
          <p>
            <strong>Failed Logins:</strong> {{ user.failedLogins }} failed
            attempts
          </p>
          <p>
            <strong>Last Login:</strong>
            {{ formatDate(user.lastLogin) ?? 'Never logged in' }}
          </p>
          <p><strong>Is Active:</strong> {{ user.isActive ? 'Yes' : 'No' }}</p>
          <p>
            <strong>Is Locked out:</strong> {{ user.isLocked ? 'Yes' : 'No' }}
          </p>
        </div>
      </PageCard>
    </div>
    <div class="mt-4">
      <PrimaryButton @click="editUserVisible = true" class="mr-2"
        >Update User</PrimaryButton
      >
      <PrimaryButton @click="updateLock" class="mr-2">{{
        user.isLocked ? 'Unlock User' : 'Lock User'
      }}</PrimaryButton>
      <PrimaryButton @click="deleteUser">Delete User</PrimaryButton>
    </div>

    <Dialog header="Edit User" modal v-model:visible="editUserVisible">
      <UserEditForm
        :user="user"
        @saved="saveUser"
        @cancel="editUserVisible = false"
      ></UserEditForm>
    </Dialog>
  </template>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import type { ErrorBody, ErrorResponse, CCFUser } from '@/stores/types';
import PageCard from '@/components/PageCard.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import Dialog from '@/volt/Dialog.vue';
import UserEditForm from '@/components/users/UserEditForm.vue';
import { useConfirm } from 'primevue/useconfirm';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const {
  data: user,
  isLoading: loading,
  error,
} = useDataApi<CCFUser>(`/api/users/${route.params.id}`);
const { execute: deleteExecute } = useDataApi<void>(
  `/api/users/${route.params.id}`,
  { method: 'DELETE' },
  { immediate: false },
);
const { data: updatedUserData, execute: lockExecute } = useDataApi<CCFUser>(
  `/api/users/${route.params.id}`,
  { method: 'PUT' },
  { immediate: false },
);

watch(error, (err) => {
  if (err) {
    const errorResponse = err as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error loading user',
      detail:
        errorResponse.response?.data.errors.body ||
        'An error occurred while loading the user data.',
      life: 3000,
    });
    router.push({ name: 'users-list' });
  }
});

const editUserVisible = ref(false);

function saveUser(updatedUser?: CCFUser) {
  editUserVisible.value = false;
  if (updatedUser) {
    user.value = updatedUser;
  }
}

async function updateLock() {
  if (!user.value) return;
  const newIsLocked = !user.value.isLocked;
  const updatedUser = { ...user.value, isLocked: newIsLocked };
  try {
    await lockExecute({ data: updatedUser });
    user.value = updatedUserData.value ?? user.value;

    toast.add({
      severity: 'success',
      summary: `User ${newIsLocked ? 'locked' : 'unlocked'} successfully`,
      detail: `User ${updatedUser.firstName} ${updatedUser.lastName} has been ${newIsLocked ? 'locked' : 'unlocked'}.`,
      life: 3000,
    });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: `Error ${newIsLocked ? 'locking' : 'unlocking'} user`,
      detail:
        errorResponse.response?.data.errors.body ||
        'An error occurred while updating the user lock status.',
      life: 3000,
    });
  }
}

function deleteUser() {
  if (!user.value) return;
  confirm.require({
    message: `Are you sure you want to delete user ${user.value.firstName} ${user.value.lastName}? This action cannot be undone.`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
    },
    acceptProps: {
      label: 'Delete',
      severity: 'danger',
    },
    accept: async () => {
      try {
        await deleteExecute();
        if (!user.value) return;
        toast.add({
          severity: 'success',
          summary: 'User deleted successfully',
          detail: `User ${user.value.firstName} ${user.value.lastName} has been deleted.`,
          life: 3000,
        });
        router.push({ name: 'users-list' });
      } catch (error) {
        const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
        toast.add({
          severity: 'error',
          summary: 'Error deleting user',
          detail:
            errorResponse.response?.data.errors.body ||
            'An error occurred while deleting the user.',
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
