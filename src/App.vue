<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Toast from '@/volt/Toast.vue';
import ConfirmDialog from '@/volt/ConfirmDialog.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';

const route = useRoute();

const showThemeToggle = computed(
  () =>
    !route.matched.some(
      (record) => record.meta.hideThemeToggle || record.meta.uiVersion === 'v2',
    ),
);
</script>

<template>
  <ThemeToggle v-if="showThemeToggle" />
  <Toast />
  <ConfirmDialog />
  <RouterView />
</template>
