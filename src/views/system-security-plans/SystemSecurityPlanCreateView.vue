<template>
  <PageHeader>New System Security Plan</PageHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  ></div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { type SystemSecurityPlan } from '@/oscal';
import { useSystemSecurityPlanStore } from '@/stores/system-security-plans';

const sspStore = useSystemSecurityPlanStore();

const systemSecurityPlans = ref<SystemSecurityPlan[]>([]);

onMounted(() => {
  sspStore.list().then((data) => {
    systemSecurityPlans.value = data.data;
  });
});
</script>
