<template>
  <PageHeader>
    New Dashboard
  </PageHeader>
  <PageCard class="mt-8 w-1/2">
    <form @submit.prevent="submit">
      <div class="mb-4">
        <label class="inline-block pb-2">Name</label>
        <FormInput v-model="dashboard.name" />
      </div>
      <div class="mb-4">
        <label class="inline-block pb-2">Result Filter</label>
        <FormInput v-model="filter" />
      </div>
      <div class="text-right">
        <PrimaryButton
          type="submit"
        >
          Submit
        </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import { FilterParser } from '@/parsers/labelfilter.ts'
import { type Dashboard, useDashboardStore } from '@/stores/dashboards.ts'
import FormInput from '@/components/forms/FormInput.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'

const router = useRouter();
const route = useRoute();
const store = useDashboardStore();
const dashboard = ref<Dashboard>({} as Dashboard);

const filter = ref<string>("");

onMounted(() => {
  if (route.query['filter']) {
    filter.value = route.query['filter'] as string;
  }
})

async function submit() {
  try {
    const parsedFilter = new FilterParser(filter.value).parse();
    await store.create({
      ...dashboard.value,
      filter: parsedFilter,
    })
    return router.push({
      name: 'findings',
      query: { filter: filter.value },
    });
  } catch (error) {
    console.error(error);
  }
}
</script>
