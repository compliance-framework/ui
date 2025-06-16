<template>
  <PageHeader>Login</PageHeader>
  <PageSubHeader>Login to your account</PageSubHeader>
  <PageCard class="mt-6">
    <form @submit.prevent="onSubmit" class="space-y-6">
      <div>
        <label
          for="email"
          class="block text-sm font-medium text-gray-700 dark:text-slate-300"
          >Email</label
        >
        <FormInput v-model="email" placeholder="Email" />
        <span class="text-sm text-red-500 dark:text-red-500" v-for="error in errors.email">{{ error }}</span>
      </div>
      <div>
        <label
          for="password"
          class="block text-sm font-medium text-gray-700 dark:text-slate-300"
          >Password</label
        >
        <FormInput v-model="password" placeholder="Password" type="password" />
        <span class="dark:text-red-500" v-for="error in errors.password">{{ error }}</span>
      </div>
      <div>
        <PrimaryButton type="submit" class="w-full"> Login </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import PageCard from '@/components/PageCard.vue';
import { ref } from 'vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import { useAuthStore } from '@/stores/auth';
import { useRoute, useRouter } from 'vue-router';
import type { DataResponse } from '@/stores/api.ts'
import FormInput from '@/components/forms/FormInput.vue'

interface AuthError {
  email: string[];
  password: string[];
}

const email = ref('');
const password = ref('');
const errors = ref<AuthError>({} as AuthError);


const authStore = useAuthStore();

const route = useRoute();
const router = useRouter();

function onSubmit() {
  // TODO: implement actual login logic
  console.log('Logging in with', email.value, password.value);
  errors.value = {} as AuthError;
  authStore
    .login(email.value, password.value)
    .then(() => {
      if (route.query.hasOwnProperty('next')) {
        return router.push(route.query.next as string);
      }
      return router.push({ name: 'home' });
    })
    .catch(async (response) => {
      if (response.status === 401) {
        const errorResponse = (await response.json()) as DataResponse<AuthError>;
        errors.value = errorResponse.data as AuthError;
      }
    });
}
</script>
