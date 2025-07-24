<script setup lang="ts">
import type { Part } from '@/oscal'

const { part } = defineProps<{
  part: Part,
}>()

</script>

<template>
  <div>
    <slot name="default" :part="part"></slot>
    <div
      v-if="part.parts"
      class="pl-2"
    >
      <PartDisplay v-for="child in part.parts" :key="child.id" :part="child" v-bind="$attrs">
        <template v-for="(_, slot) in $slots" v-slot:[slot]="data: Part">
          <slot  :name="slot" v-bind="data"  />
        </template>
      </PartDisplay>
    </div>
  </div>
</template>
