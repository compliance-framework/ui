<script setup lang="ts">
import type { Part } from '@/oscal'

const props = defineProps<{
  part: Part,
  level: number,
}>()

function getText() {
  console.log(props.part)
}

</script>

<template>
  <slot name="default" :part="part"></slot>

  <PartDisplay v-for="child in part.parts" :key="child.id" :part="child" :level="level + 1">
    <template v-for="(_, slot) in $slots" v-slot:[slot]="data: Part">
      <slot  :name="slot" v-bind="data"  />
    </template>
<!--    <template v-for="(_, slot) of $slots" v-slot:[slot]="child || {}"><slot :name="slot" v-bind="child"/></template>-->
<!--    <template v-for="slot in Object.keys($scopedSlots)" :slot="slot" slot-scope="scope"><slot :name="slot" v-bind="scope"/></template>-->

  </PartDisplay>
</template>

<style scoped>

</style>
