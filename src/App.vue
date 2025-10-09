<script setup lang="ts">
import { RouterView } from 'vue-router';
import Toast from '@/volt/Toast.vue';
import ConfirmDialog from '@/volt/ConfirmDialog.vue';
import ErrorDialogHost from '@/components/notifications/ErrorDialogHost.vue';
</script>

<template>
  <Toast />
  <ErrorDialogHost />
  <ConfirmDialog />
  <RouterView />
</template>
