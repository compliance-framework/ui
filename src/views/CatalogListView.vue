<template>
  <PageHeader>Catalogs</PageHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  >
    <table class="table-auto w-full rounded-full dark:text-slate-300">
      <tbody>
      <tr
        class="hover:bg-zinc-50 dark:hover:bg-slate-800 border-b dark:border-slate-800"
        v-for="catalog in catalogs"
        :key="catalog.uuid"
      >
        <td class="py-3 px-4 whitespace-nowrap grow">{{ catalog.metadata.title }}</td>
        <td class="py-2 px-2 text-right whitespace-nowrap">
          <RouterLink
            class="bg-white hover:bg-zinc-100 border px-4 py-1 rounded-md dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700"
            :to="{ name: 'catalog-view', params: { id: catalog.uuid } }"
          >View
          </RouterLink>
        </td>
      </tr>
      </tbody>
    </table>
  </div>

  <div class="mt-4">
    <RouterLink
      class="bg-transparent font-light hover:bg-zinc-100 dark:text-slate-300 dark:hover:bg-slate-800 border dark:border-slate-700 px-4 py-1 rounded-md"
      :to="{ name: 'catalog-create' }"
    >Create Catalog
    </RouterLink>
  </div>

</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { type Catalog, useCatalogStore } from '@/stores/catalogs.ts'

const catalogStore = useCatalogStore()

const catalogs = ref<Catalog[]>([])

onMounted(() => {
  catalogStore.list().then((data) => {
    catalogs.value = data.data
  })
})
</script>
