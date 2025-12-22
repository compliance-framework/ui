<template>
  <div class="px-12 py-8">
    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Email</label>
      <FormInput v-model="user.email" placeholder="Email" required />
    </div>
    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">First Name</label>
      <FormInput v-model="user.firstName" placeholder="First Name" required />
    </div>
    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Last Name</label>
      <FormInput v-model="user.lastName" placeholder="Last Name" required />
    </div>
    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Password</label>
      <FormInput
        v-model="passwords.password"
        type="password"
        placeholder="Password"
        required
      />
      <span v-if="passwords.error" class="text-red-500">{{
        passwords.error
      }}</span>
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300"
        >Confirm Password</label
      >
      <FormInput
        v-model="passwords.confirmPassword"
        type="password"
        placeholder="Confirm Password"
        required
      />
    </div>

    <div class="border-t-1 border-t-ccf-300">
      <PrimaryButton class="mt-4" @click.prevent="createUser">
        Save User
      </PrimaryButton>

      <PrimaryButton class="mt-4 ml-2" @click.prevent="emit('cancel')">
        Cancel
      </PrimaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  CCFUserCreate,
  CCFUser,
  ErrorResponse,
  ErrorBody,
} from '@/stores/types';
import { ref, defineEmits, watch, reactive } from 'vue';
import FormInput from '../forms/FormInput.vue';
import PrimaryButton from '../PrimaryButton.vue';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import { useToast } from 'primevue/usetoast';

const passwords = reactive({
  password: '',
  confirmPassword: '',
  error: '',
});

watch(passwords, () => {
  if (passwords.password !== passwords.confirmPassword) {
    passwords.error = 'Passwords do not match';
  } else {
    passwords.error = '';
  }
});

const user = ref<CCFUserCreate>({} as CCFUserCreate);

const emit = defineEmits<{
  cancel: [];
  create: [user: CCFUser];
}>();

const toast = useToast();
const { data: createdUser, execute } = useDataApi<CCFUser>(
  '/api/admin/users',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  },
  {
    immediate: false,
  },
);

async function createUser() {
  if (passwords.error) {
    return;
  }
  user.value.password = passwords.password;

  try {
    await execute({
      data: user.value,
    });

    if (!createdUser.value) {
      toast.add({
        severity: 'error',
        summary: 'Error creating user',
        detail: 'User creation failed, please try again.',
        life: 3000,
      });
      return;
    }

    emit('create', createdUser.value);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error creating user',
      detail:
        errorResponse.response?.data.errors.body ?? 'Unknown error occurred',
      life: 3000,
    });
    return;
  }
}
</script>
