<script setup lang="ts">
import { RouterView } from 'vue-router';
import Toast from '@/volt/Toast.vue';
import ConfirmDialog from '@/volt/ConfirmDialog.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
</script>

<template>
  <ThemeToggle />
  <Toast />
  <ConfirmDialog />
  <RouterView />
</template>
