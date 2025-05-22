<template>
  <CollapsableGroup>
    <template #header>
      <div class="py-4 px-4">
        <span class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-gray-800 dark:text-slate-300 rounded-md text-sm px-2 py-1 mr-2">{{group.id}}</span>{{ group.title }} <span class="text-gray-400 dark:text-slate-300 text-sm px-2 py-1">Group</span>
      </div>
    </template>
    <div class="px-4 py-4 dark:bg-slate-950 border-b dark:border-slate-700">
      <template v-if="hasPart('assessment-objective')">
        <h4 class="font-medium mt-2">Objective:</h4>
        <p class="whitespace-pre-wrap">{{ getPart('assessment-objective')?.prose }}</p>
      </template>

      <div>
        <PartDisplayEditor v-for="part in group.parts" :key="part.id" :part="part"></PartDisplayEditor>
      </div>

      <div
        class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
      >
        <CatalogControl v-for="control in controls" :key="control.id" :control="control" :catalog="props.catalog" />
        <CatalogGroup v-for="group in groups" :key="group.id" :group="group" :catalog="props.catalog" />
      </div>
      <div class="mt-4">
<!--        <TertiaryButton v-if="controls.length == 0" @click="showGroupForm = true">Add Group</TertiaryButton>-->
<!--        <TertiaryButton v-if="groups.length == 0" @click="showControlForm = true" class="ml-2">Add Control</TertiaryButton>-->
        <GroupCreateModal @created="groupCreated" :catalog="catalog" :parent="props.group" v-model="showGroupForm" />
        <ControlCreateModal @created="controlCreated" :catalog="catalog" :parent-group="props.group" v-model="showControlForm" />
      </div>
    </div>
  </CollapsableGroup>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CollapsableGroup from '@/components/CollapsableGroup.vue'
import { type Catalog, type Group, type Control, useCatalogStore } from '@/stores/catalogs.ts'
import TertiaryButton from '@/components/TertiaryButton.vue'
import GroupCreateModal from '@/components/catalogs/GroupCreateModal.vue'
import ControlCreateModal from '@/components/catalogs/ControlCreateModal.vue'
import PartDisplayEditor from '@/components/PartDisplayEditor.vue'

const props = defineProps<{
  catalog: Catalog,
  group: Group,
}>()

const catalogStore = useCatalogStore()
const groups = ref<Group[]>([]);
const controls = ref<Control[]>([]);

function hasPart(type: string) {
  return props.group.parts?.find((part) => {
    return part.name == type
  })
}

function getPart(type: string) {
  return props.group.parts?.find((part) => {
    return part.name == type
  })
}

onMounted(() => {
  catalogStore.listGroupGroups(props.catalog.uuid, props.group).then((data) => {
    groups.value = data.data
  })
  catalogStore.listGroupControls(props.catalog.uuid, props.group).then((data) => {
    controls.value = data.data
  });
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
