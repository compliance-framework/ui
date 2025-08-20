<template>
  <p>Logging out...</p>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/auth';
import { onMounted } from 'vue';

const router = useRouter();
const user = useUserStore();

onMounted(() => {
  user.isAuthenticated = false;
  router.push({ name: "login" });
});
</script>
