<template>
  <div class="inline-flex">
    <div v-if="state == 'satisfied'" class="text-base text-center w-8 h-4 font-light bg-green-700 rounded-full text-white">
    </div>
    <div v-else-if="state == 'not satisfied'" class="text-base text-center w-4 h-4 font-light bg-red-600 rounded-full text-white">
    </div>
    <div v-else class="text-base text-center w-8 h-4 font-light bg-zinc-400 rounded-full text-white">
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps(['state'])
</script>
