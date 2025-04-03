<template>
  <PageHeader>Catalogs</PageHeader>
<!--  <PageSubHeader></PageSubHeader>-->

  <PageCard class="mt-4">
    <div v-for="catalog in catalogs" :key="catalog.uuid" class="p-0">
      <div class="flex items-center">
        <h3 class="py-2 px-4">
          {{ catalog.metadata.title }}
        </h3>
        <RouterLink
          class="bg-gray-50 hover:bg-gray-200 text-blue-800 border border-blue-800 px-4 py-1 rounded-md text-sm mr-2"
          :to="{ name: 'catalog-view', params: { id: catalog.uuid } }"
        >View
        </RouterLink>
      </div>
    </div>
  </PageCard>

</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import PageCard from '@/components/PageCard.vue'
import { type Catalog, useCatalogStore } from '@/stores/catalogs.ts'

const catalogStore = useCatalogStore()

const catalogs = ref<Catalog[]>([])

onMounted(() => {
  catalogStore.list().then((data) => {
    catalogs.value = data.data
  })
})
</script>
