<template>
  <PageHeader>
    New Assessment Plan
  </PageHeader>
  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="createPlan">
      <div class="mb-4">
        <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          v-model="plan.metadata.title"
          id="name"
          name="name"
          required
          class="mt-1 w-full rounded-md border-black border px-4 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <div class="mb-4">
        <label for="filter" class="block text-sm font-medium text-gray-700">Result Filter</label>
        <input
          type="text"
          v-model="filter"
          id="filter"
          name="filter"
          class="mt-1 w-full rounded-md border-black border px-4 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>
      <button
        type="submit"
        class="px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-700"
      >
        Submit
      </button>
    </form>
  </PageCard>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import { useApiStore, type Plan } from '@/stores/api'
import { FilterParser } from '@/parsers/labelfilter.ts'

const router = useRouter();
const route = useRoute();
const apiStore = useApiStore();
const plan = ref<Plan>({metadata: {}} as Plan);

const filter = ref<string>("");

onMounted(() => {
  if (route.query['filter']) {
    filter.value = route.query['filter'] as string;
  }
})

async function createPlan() {
  try {
    const planfilter = new FilterParser(filter.value).parse();
    const newPlan = await apiStore.createPlan(plan.value, planfilter)
    return router.push({
      name: 'assessment-plan.view',
      params: { id: newPlan.uuid },
    });
  } catch (error) {
    console.error(error);
  }
}
</script>
