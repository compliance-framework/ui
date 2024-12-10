<script setup lang="ts">
import { RouterView } from 'vue-router'
import LeftSideNav from '@/views/LeftSideNav.vue'
</script>

<template>
  <div class="flex">
    <div class="w-72 h-screen px-2 py-4">
      <LeftSideNav class="h-full bg-white rounded-3xl" />
    </div>
    <main class="grow">
      <RouterView />
    </main>
  </div>
</template>

<style>
body, html {
  @apply bg-slate-100;
}
</style>
