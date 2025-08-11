<template>
  <div class="px-12 py-8">
    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300" v-tooltip.top="'Email cannot be edited'">Email</label>
        <div class="p-3 bg-gray-50 dark:bg-slate-800 border border-ccf-300 dark:border-slate-700 rounded-md">
        <span class="text-gray-600 dark:text-slate-400 font-mono">{{ user.email }}</span>
      </div>
    </div>
    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">First Name</label>
      <FormInput v-model="user.firstName" placeholder="First Name" required />
    </div>
    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Last Name</label>
      <FormInput v-model="user.lastName" placeholder="Last Name" required />
    </div>

    <div class="border-t-1 border-t-ccf-300">
      <PrimaryButton class="mt-4" @click.prevent="updateUser">
        Save User
      </PrimaryButton>

      <PrimaryButton class="mt-4 ml-2" @click.prevent="emit('cancel')">
        Cancel
      </PrimaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">

import type { CCFUser, ErrorBody, ErrorResponse } from '@/stores/types';
import { defineProps, reactive, defineEmits, watch } from 'vue';
import FormInput from '../forms/FormInput.vue';
import PrimaryButton from '../PrimaryButton.vue';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import { useToast } from 'primevue/usetoast';

const props = defineProps<{
  user: CCFUser;
}>();

// Keep local user in sync with prop changes
watch(
  () => props.user,
  (newUser: CCFUser) => {
    Object.assign(user, newUser);
  }
);

const emit = defineEmits<{
  cancel: [];
  saved: [updatedUser: CCFUser | undefined];
}>();

const user = reactive({ ...props.user });

const toast = useToast();
const { data: updatedUser, execute } = useDataApi<CCFUser>(`/api/users/${user.id}`, {
    method: 'PUT',
  data: user,
}, { immediate: false });

async function updateUser() {
  try {
    await execute();
    emit('saved', updatedUser.value);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error updating user',
      detail: errorResponse.response?.data.errors.body ?? 'An error occurred while updating the user.',
      life: 3000,
    });
  }
}
</script>
