<template>
  <PageCard class="mx-auto mt-12 max-w-96 py-8">
    <div class="px-8 pb-8">
      <SideNavLogo alt="Vue logo" :src="lightLogo" class="w-full dark:hidden"/>
      <SideNavLogo alt="Vue logo" :src="darkLogo" class="w-full hidden dark:block"/>
    </div>
    <form @submit.prevent="onSubmit" class="space-y-4">
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
import PageCard from '@/components/PageCard.vue';
import { ref } from 'vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import { useAuthStore } from '@/stores/auth';
import { useRoute, useRouter } from 'vue-router';
import type { DataResponse } from '@/stores/api.ts'
import FormInput from '@/components/forms/FormInput.vue'
import lightLogo from '@/assets/logo-light.svg'
import darkLogo from '@/assets/logo-dark.svg'
import SideNavLogo from '@/components/navigation/SideNavLogo.vue'
import { useToast } from 'primevue/usetoast';

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
const toast = useToast();

function onSubmit() {
  errors.value = {} as AuthError;
  authStore
    .login(email.value, password.value)
    .then(() => {
      toast.add({
        severity: 'success',
        summary: 'Login Successful',
        detail: 'You have successfully logged in.',
        life: 3000,
      });
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
      toast.add({
        severity: 'error',
        summary: 'Login Failed',
        life: 3000,
      });
    });
}
</script>
