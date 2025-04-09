<template>
  <CollapsableGroup>
    <template #header>
      <div class="py-4 px-4">
        <span class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-gray-800 dark:text-slate-300 rounded-md text-sm px-2 py-1 mr-2">{{group.id}}</span>{{ group.title }}
      </div>
    </template>
    <div class="px-4 py-4 border-b dark:border-slate-700">
      <h4 class="font-medium">Statement:</h4>
      <p>{{ getStatement(group.parts)?.prose }}</p>
      <h4 class="font-medium mt-2">Objective:</h4>
      <p>{{ getStatement(group.parts)?.prose }}</p>
      <h4 class="font-medium mt-2">Guidance:</h4>
      <p>{{ getStatement(group.parts)?.prose }}</p>
      <div
        class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border dark:border-slate-700"
      >
        <CatalogControl v-for="control in controls" :key="control.id" :control="control" />
        <CatalogGroup v-for="group in groups" :key="group.id" :group="group" />
      </div>
    </div>
  </CollapsableGroup>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { type Group, useGroupsStore } from '@/stores/groups.ts'
import CollapsableGroup from '@/components/CollapsableGroup.vue'
import { type Control, useControlStore } from '@/stores/controls.ts'
import type { Part } from '@/stores/types.ts'

const props = defineProps<{
  group: Group,
}>()

const groupStore = useGroupsStore()
const controlStore = useControlStore()
const groups = ref<Group[]>([]);
const controls = ref<Control[]>([]);

function getStatement(parts: Part[]) {
  return parts?.find((part) => {
    return part.name == "statement"
  })
}

function getGuidance(parts: Part[]) {
  return parts?.find((part) => {
    return part.name == "guidance"
  })
}

function getObjective(parts: Part[]) {
  return parts?.find((part) => {
    return part.name == "assessment-objective"
  })
}

onMounted(() => {
  groupStore.children(props.group).then((data) => {
    groups.value = data.data
  })
  controlStore.group(props.group).then((data) => {
    controls.value = data.data
  });
})
</script>
