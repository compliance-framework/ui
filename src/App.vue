<script setup lang="ts">
import { RouterView } from 'vue-router';
import Toast from '@/volt/Toast.vue';
import ConfirmDialog from '@/volt/ConfirmDialog.vue';
</script>

<template>
  <Toast />
  <ConfirmDialog />
  <RouterView />
</template>
