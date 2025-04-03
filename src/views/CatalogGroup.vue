<template>
  <CollapsableGroup>
    <template #header>
      <div class="py-4 px-4">
          {{ group.title }}
      </div>
    </template>
    <div class="px-2 py-4">
      <h4 class="font-medium">Statement:</h4>
      <p>{{ getStatement(group.parts)?.prose }}</p>
      <h4 class="font-medium">Objective:</h4>
      <p>{{ getStatement(group.parts)?.prose }}</p>
      <h4 class="font-medium">Guidance:</h4>
      <p>{{ getStatement(group.parts)?.prose }}</p>
    </div>
    <CatalogControl v-for="control in controls" :key="control.id" :control="control" />
    <CatalogGroup v-for="group in groups" :key="group.id" :group="group" />
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
