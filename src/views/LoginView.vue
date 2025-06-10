<template>
  <PageHeader>Login</PageHeader>
  <PageSubHeader>Login to your account</PageSubHeader>
  <PageCard class="mt-6">
    <form @submit.prevent="onSubmit" class="space-y-6">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
        <input
          id="email"
          type="email"
          v-model="email"
          placeholder="you@example.com"
          required
          class="mt-2 p-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
        <input
          id="password"
          type="password"
          v-model="password"
          placeholder="Enter your password"
          required
          class="mt-2 p-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <PrimaryButton type="submit" class="w-full">
          Login
        </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>

<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import PageCard from '@/components/PageCard.vue';
import { ref } from 'vue'
import PrimaryButton from '@/components/PrimaryButton.vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const email = ref('')
const password = ref('')

const authStore = useAuthStore()

const router = useRouter()


function onSubmit() {
  // TODO: implement actual login logic
  console.log('Logging in with', email.value, password.value)
  authStore.login(email.value, password.value)
    .then(() => {
      router.push({ name: 'home' })
    })
    .catch((error) => {
      console.error('Login failed:', error)

    })
}
</script>

