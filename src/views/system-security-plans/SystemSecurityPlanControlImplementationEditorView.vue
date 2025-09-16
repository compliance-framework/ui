<template>Work In Progress</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { type SystemSecurityPlan } from '@/oscal';
import { useRoute } from 'vue-router';
import { useSystemSecurityPlanStore } from '@/stores/system-security-plans';

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
