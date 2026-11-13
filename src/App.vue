<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import Toast from '@/volt/Toast.vue';
import ConfirmDialog from '@/volt/ConfirmDialog.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import DemoFeedbackButton from '@/components/DemoFeedbackButton.vue';
import ErrorDialogHost from '@/components/notifications/ErrorDialogHost.vue';

// The redesigned shell (/next) has its own theme control in the account menu.
const route = useRoute();
const inRedesign = computed(() => route.path.startsWith('/next'));
</script>

<template>
  <RouterView />
  <!-- After the page, so the page's own skip link is the first tab stop. -->
  <ThemeToggle v-if="!inRedesign" />
  <DemoFeedbackButton />
  <Toast />
  <ErrorDialogHost />
  <ConfirmDialog />
</template>
