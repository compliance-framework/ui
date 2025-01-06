<script setup lang="ts">
import { RouterView } from 'vue-router'
import LeftSideNav from '@/views/LeftSideNav.vue'
</script>

<template>
  <div class="flex">
    <div class="bg-blue-800 h-96 w-full fixed top-0 left-0 right-0 z-0"></div>
    <div class="w-96 h-screen pr-2 pl-12 py-4 z-10">
      <LeftSideNav class="h-full bg-white rounded-md" />
    </div>
    <main class="flex-1 z-10 px-8 py-4">
      <RouterView />
    </main>
  </div>
</template>

<style>
body, html {
  @apply bg-slate-100;
}
</style>
