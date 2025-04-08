<script setup lang="ts">
import { RouterView } from 'vue-router'
import LeftSideNav from '@/views/LeftSideNav.vue'
</script>

<template>
  <div class="flex">
    <div class="w-80 h-screen">
      <LeftSideNav class="h-full w-80 fixed top-0 left-0" />
    </div>
    <main class="flex-1 z-10 px-12 py-4 bg-zinc-50">
      <RouterView />
    </main>
  </div>
</template>

<style>
body, html {
  @apply bg-white;
}
</style>
