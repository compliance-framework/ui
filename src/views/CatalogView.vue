<template>
  <PageHeader>Catalog</PageHeader>
  <PageSubHeader>{{ catalog.metadata?.title }}</PageSubHeader>

  <div
    class="mt-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
  >
    <CatalogGroup v-for="group in groups" :key="group.id" :group="group" :catalog="catalog" />
    <CatalogControl v-for="control in controls" :key="control.id" :control="control" :catalog="catalog" />
  </div>
  <div class="mt-4">
<!--    <TertiaryButton v-if="controls.length == 0" @click="showGroupForm = true">Add Group</TertiaryButton>-->
<!--    <TertiaryButton v-if="groups.length == 0" @click="showControlForm = true" class="ml-2">Add Control</TertiaryButton>-->
    <GroupCreateModal @created="groupCreated" :catalog="catalog" v-model="showGroupForm" />
    <ControlCreateModal @created="controlCreated" :catalog="catalog" v-model="showControlForm" />
  </div>
  <div class="h-screen w-full"></div> <!-- A screen height div to prevent collapse scrolling back up after closing -->
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { type Catalog, type Group, type Control, useCatalogStore } from '@/stores/catalogs.ts'
import { useRoute } from 'vue-router'
import PageSubHeader from '@/components/PageSubHeader.vue'
import CatalogControl from '@/views/CatalogControl.vue'
import TertiaryButton from '@/components/TertiaryButton.vue'
import GroupCreateModal from '@/components/catalogs/GroupCreateModal.vue'
import ControlCreateModal from '@/components/catalogs/ControlCreateModal.vue'

const catalogStore = useCatalogStore()
const catalog = ref<Catalog>({} as Catalog);
const groups = ref<Group[]>([]);
const controls = ref<Control[]>([]);

const route = useRoute();
const id = route.params.id as string;

onMounted(() => {
  catalogStore.get(id).then((data) => {
    catalog.value = data.data
    catalogStore.listGroups(id).then((data) => {
      groups.value = data.data
    })
    catalogStore.listControls(id).then((data) => {
      controls.value = data.data
    })
  })
})

const showGroupForm = ref<boolean>(false);
const showControlForm = ref<boolean>(false);
function groupCreated(group: Group) {
  groups.value.push(group)
}
function controlCreated(control: Control) {
  controls.value.push(control)
}
</script>
