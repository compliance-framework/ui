<script setup lang="ts">
import { RouterView } from 'vue-router';
import Toast from '@/volt/Toast.vue';
import ConfirmDialog from '@/volt/ConfirmDialog.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import DemoFeedbackButton from '@/components/DemoFeedbackButton.vue';
</script>

<template>
  <ThemeToggle />
  <DemoFeedbackButton />
  <Toast />
  <ConfirmDialog />
  <RouterView />
</template>
