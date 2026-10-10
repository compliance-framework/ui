<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AppV1Layout from '@/views/layouts/AppV1Layout.vue';
import AppV2Layout from '@/views/layouts/AppV2Layout.vue';

import { useUserStore } from '@/stores/auth';
import { usePermissionsStore } from '@/stores/permissions';

const route = useRoute();
const userStore = useUserStore();
const permissionsStore = usePermissionsStore();

onMounted(() => {
  if (userStore.isAuthenticated) {
    void permissionsStore.hydrate();
  }
});

const usesV2Shell = computed(() =>
  route.matched.some((record) => record.meta.uiVersion === 'v2'),
);

const activeLayout = computed(() =>
  usesV2Shell.value ? AppV2Layout : AppV1Layout,
);
</script>

<template>
  <component :is="activeLayout" />
</template>
