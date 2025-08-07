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

import type { CCFUser, DataResponse, ErrorBody, ErrorResponse } from '@/stores/types';
import { defineProps, reactive, defineEmits, watch } from 'vue';
import FormInput from '../forms/FormInput.vue';
import PrimaryButton from '../PrimaryButton.vue';
import { useApi } from '@/composables/axios';
import { useAxios } from '@vueuse/integrations/useAxios';
import type { AxiosError } from 'axios';

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
  saved: [updatedUser: DataResponse<CCFUser>];
  error: [error: string];
}>();
const instance = useApi();

const user = reactive({ ...props.user });

async function updateUser() {
  try {
    const { data: updatedUser } = await useAxios<DataResponse<CCFUser>>(`/api/users/${user.id}`, {
      method: 'PUT',
      data: user,
    }, instance);
    emit('saved', updatedUser.value);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    emit('error', errorResponse.response?.data.errors.body ?? 'Unknown error occurred');
  }
}
</script>
