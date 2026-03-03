<template>
  <AuthPanelCard>
    <p class="ui-v2-label mb-3 text-[var(--ui-v2-secondary-foreground)]">
      Signing out
    </p>
    <h1
      class="ui-v2-display text-[28px] font-bold uppercase leading-none tracking-[-0.02em] text-[var(--ui-v2-foreground)]"
    >
      Closing session
    </h1>
    <p class="mt-2 text-[var(--ui-v2-muted-foreground)]">
      We are clearing your credentials and returning to sign-in.
    </p>
  </AuthPanelCard>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/auth';
import { useGuestInstance } from '@/composables/axios';
import AuthPanelCard from '@/components/v2/auth/AuthPanelCard.vue';

const router = useRouter();
const user = useUserStore();
const axios = useGuestInstance();

onMounted(async () => {
  try {
    await axios.post('/api/auth/logout');
  } catch {
    // Proceed with local logout even if the server call fails
  } finally {
    user.logout();
    router.push({ name: 'login' });
  }
});
</script>
