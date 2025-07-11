<template>
  Work In Progress
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  type SystemSecurityPlan,
  useSystemSecurityPlanStore
} from '@/stores/system-security-plans.ts'
import { useRoute } from 'vue-router';

const route = useRoute();
const id = route.params.id as string;
const sspStore = useSystemSecurityPlanStore();

const systemSecurityPlan = ref<SystemSecurityPlan | null>(null);

onMounted(() => {
  sspStore.get(id).then((data) => {
    systemSecurityPlan.value = data.data;
  });
});

</script>
