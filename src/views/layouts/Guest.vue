<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="flex">
    <main
      class="z-10 px-12 py-4 bg-zinc-50 dark:bg-slate-950 text-zinc-800 dark:text-slate-50 w-full h-screen"
    >
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
  </div>
</template>

<style>
@reference "@/assets/main.css";

body,
html {
  @apply bg-white;
}
</style>
