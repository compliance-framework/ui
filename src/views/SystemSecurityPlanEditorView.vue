<template>
  <PageHeader>System Security Plan</PageHeader>
  <PageSubHeader>{{ systemSecurityPlan.metadata?.title }}</PageSubHeader>

  <p class="mt-4">
    {{ systemSecurityPlan.metadata?.remarks }}
  </p>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700 h-2/3"
  >
<!--    <DiagramEditor />-->
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import {
  type SystemSecurityPlan,
  useSystemSecurityPlanStore,
} from '@/stores/system-security-plans.ts';
import { useRoute } from 'vue-router';
import PageSubHeader from '@/components/PageSubHeader.vue';
import DiagramEditor from '@/components/DiagramEditor.vue';

const route = useRoute();
const id = route.params.id as string;
const sspStore = useSystemSecurityPlanStore();

const systemSecurityPlan = ref<SystemSecurityPlan>({} as SystemSecurityPlan);

onMounted(() => {
  sspStore.get(id).then((data) => {
    systemSecurityPlan.value = data.data;
  });
});

</script>
