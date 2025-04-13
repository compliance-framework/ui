<template>
  <PageHeader>Catalog</PageHeader>
  <PageSubHeader>{{ catalog.metadata?.title }}</PageSubHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  >
    <CatalogGroup v-for="group in groups" :key="group.id" :group="group" :catalog="catalog" />
  </div>
  <div class="h-screen w-full"></div> <!-- A screen height div to prevent collapse scrolling back up after closing -->
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { type Catalog, useCatalogStore } from '@/stores/catalogs.ts'
import { useRoute } from 'vue-router'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type Group, useGroupsStore } from '@/stores/groups.ts'

const catalogStore = useCatalogStore()
const groupStore = useGroupsStore()
const catalog = ref<Catalog>({} as Catalog);
const groups = ref<Group[]>([]);

const route = useRoute();
const id = route.params.id as string;

onMounted(() => {
  catalogStore.get(id).then((data) => {
    catalog.value = data.data
    groupStore.catalog(catalog.value as Catalog).then((data) => {
      groups.value = data.data
    })
  })
})
</script>
