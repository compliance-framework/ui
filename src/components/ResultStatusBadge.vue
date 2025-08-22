<template>
  <div class="inline-flex">
    <div
      class="text-base text-center w-8 font-light bg-green-700 rounded-l-full text-white"
    >
      {{ green }}
    </div>
    <div
      class="text-base text-center w-8 font-light bg-zinc-400 text-white border-x border-white"
    >
      {{ gray }}
    </div>
    <div
      class="text-base text-center w-8 font-light bg-red-600 rounded-r-full text-white"
    >
      {{ red }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps(['green', 'gray', 'red']);
</script>
