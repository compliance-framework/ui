<script setup lang="ts">
import type { Part } from '@/oscal'

const { part } = defineProps<{
  part: Part,
}>()

const emit = defineEmits<{
  selected: [e: Event, part: Part],
}>()

function onSelect(e: Event, part: Part) {
  emit('selected', e, part)
}
</script>

<template>
  <div :id="part.id" @click.stop="onSelect($event, part)">
    <slot name="default" :part="part"></slot>
    <div
      v-if="part.parts"
      class="pl-4"
    >
      <PartDisplay v-for="child in part.parts" :key="child.id" :part="child" @selected="onSelect">
        <template v-for="(_, slot) in $slots" v-slot:[slot]="data: Part">
          <slot  :name="slot" v-bind="data"  />
        </template>
      </PartDisplay>
    </div>
  </div>
</template>
