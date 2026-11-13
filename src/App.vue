<script setup lang="ts">
import { RouterView } from 'vue-router';
import ToastRegion from '@/ds/components/ToastRegion/ToastRegion.vue';
import ConfirmHost from '@/ds/components/ConfirmDialog/ConfirmHost.vue';
import DemoFeedbackButton from '@/components/DemoFeedbackButton.vue';
import ErrorDialogHost from '@/components/notifications/ErrorDialogHost.vue';
import { useTheme } from '@/composables/useTheme';

// Applies the saved theme on every page, guest pages included; the app shell's account menu
// changes it.
useTheme();
</script>

<template>
  <RouterView />
  <!-- After the page, so the page's own skip link is the first tab stop. -->
  <DemoFeedbackButton />
  <ToastRegion />
  <ErrorDialogHost />
  <ConfirmHost />
</template>
