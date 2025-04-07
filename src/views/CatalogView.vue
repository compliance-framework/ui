<template>
  <PageHeader>Catalog</PageHeader>
  <PageSubHeader>{{ catalog.metadata?.title }}</PageSubHeader>

  <PageCard class="mt-4">
    <CatalogGroup v-for="group in groups" :key="group.id" :group="group" />
  </PageCard>

</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { type Catalog, useCatalogStore } from '@/stores/catalogs.ts'
import { useRoute } from 'vue-router'
import PageSubHeader from '@/components/PageSubHeader.vue'
import { type Group, useGroupsStore } from '@/stores/groups.ts'
import PageCard from '@/components/PageCard.vue'

const catalogStore = useCatalogStore()
const groupStore = useGroupsStore()
const catalog = ref<Catalog>({} as Catalog);
const groups = ref<Group[]>([]);

const route = useRoute();
const id = route.params.id as string;

onMounted(() => {
  catalogStore.get(id).then((data) => {
    catalog.value = data.data
  })
  groupStore.catalog(id).then((data) => {
    groups.value = data.data
  })
})
</script>
