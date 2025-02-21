<template>
  <PageHeader> Assessment Plans</PageHeader>
  <PageCard class="mt-8">
    <div>
      <div
        class="grid grid-cols-2 gap-4 items-center border-t first:border-none hover:bg-zinc-100 py-1"
        v-for="plan in plans"
        :key="plan.uuid"
      >
        <div class="pl-4">{{ plan.metadata.title }}</div>
        <div>
          <RouterLink
            class="bg-blue-800 hover:bg-clue-700 text-white px-4 py-1 rounded-md text-sm inline-block"
            :to="{ name: 'assessment-plan.view', params: { id: plan.uuid } }"
            >View
          </RouterLink>
        </div>
      </div>
    </div>
    <div class="mt-4">
      <RouterLink
        class="bg-gray-50 border border-blue-800 hover:bg-gray-200 text-blue-800 px-4 py-2 rounded inline-block"
        :to="{ name: 'assessment-plan.create' }"
        >Create
      </RouterLink>
    </div>
  </PageCard>
</template>
<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import { onMounted, ref } from 'vue'
import { useApiStore, type Plan } from '@/stores/api.ts'

const apiStore = useApiStore();
const plans = ref<Plan[]>([] as Plan[]);

onMounted(() => {
  apiStore.getPlans().then((res) => {
    plans.value = res.data;
  });
});
</script>
