<script setup lang="ts">
import { RouterView } from 'vue-router'
import LeftSideNav from '@/views/LeftSideNav.vue'
</script>

<template>
  <div class="flex">
    <div class="bg-blue-800 h-52 w-full absolute top-0 left-0 right-0 z-0"></div>
    <div class="w-72 h-screen px-2 py-4 z-10">
      <LeftSideNav class="h-full bg-white rounded-3xl" />
    </div>
    <main class="grow z-10 px-8 py-4">
      <RouterView />
    </main>
  </div>
</template>

<style>
body, html {
  @apply bg-slate-100;
}
</style>
