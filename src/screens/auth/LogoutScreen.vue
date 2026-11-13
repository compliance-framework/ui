<script setup lang="ts">
/** Signing out (Guest template): clears the session flag and returns to sign in. */
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/auth';
import Text from '@/ds/components/Text/Text.vue';
import GuestTemplate from '@/ds/templates/GuestTemplate/GuestTemplate.vue';

const router = useRouter();
const user = useUserStore();

onMounted(() => {
  user.isAuthenticated = false;
  router.push({ name: 'login' });
});
</script>

<template>
  <GuestTemplate title="Signing out">
    <Text role="status">Signing you out…</Text>
  </GuestTemplate>
</template>
