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
      <PrimaryButton class="mt-4" @click.prevent="emit('saved', user)">
        Save User
      </PrimaryButton>

      <PrimaryButton class="mt-4 ml-2" @click.prevent="emit('cancel')">
        Cancel
      </PrimaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">

import { type CCFUser } from '@/stores/types';
import { defineProps, ref, defineEmits } from 'vue';
import FormInput from '../forms/FormInput.vue';
import PrimaryButton from '../PrimaryButton.vue';



const props = defineProps<{
  user: CCFUser;
}>();

const user = reactive({ ...props.user });

// Keep local user in sync with prop changes
watch(
  () => props.user,
  (newUser) => {
    Object.assign(user, newUser);
  }
);
const emit = defineEmits<{
  cancel: [];
  saved: [user: CCFUser];
}>();

</script>
