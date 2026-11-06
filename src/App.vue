<script setup lang="ts">
import { RouterView } from 'vue-router';
import Toast from '@/volt/Toast.vue';
import ConfirmDialog from '@/volt/ConfirmDialog.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import DemoFeedbackButton from '@/components/DemoFeedbackButton.vue';
import ErrorDialogHost from '@/components/notifications/ErrorDialogHost.vue';
</script>

<template>
  <ThemeToggle />
  <DemoFeedbackButton />
  <Toast />
  <ErrorDialogHost />
  <ConfirmDialog />
  <RouterView />
</template>
