<template>
    <div v-if="state == 'satisfied'" :class="{...classes, 'bg-green-700': true}">
    </div>
    <div v-else-if="state == 'not satisfied'" :class="{...classes, 'bg-red-600': true}">
    </div>
    <div v-else :class="{...classes, 'bg-zinc-400': true}">
    </div>
</template>

<script setup lang="ts">
defineProps(['state'])

const classes = {
  "text-base text-center w-8 h-5 rounded-full font-light": true,
}
</script>
