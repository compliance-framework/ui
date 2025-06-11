<template>
  <p>Logging out...</p>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { onMounted } from 'vue';

const router = useRouter();
const authStore = useAuthStore();


onMounted(() => {
  authStore.logout().then(() => {
    router.push({ name: "login" });
  });
});
</script>
