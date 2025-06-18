<script setup lang="ts">
import { RouterView } from 'vue-router'
import LeftSideNav from '@/views/LeftSideNav.vue'
</script>

<template>
  <div class="flex">
    <div class="w-80 h-screen">
      <LeftSideNav class="h-full w-80 fixed top-0 left-0" />
    </div>
    <main class="flex-1 z-10 px-12 py-4 bg-zinc-50 dark:bg-slate-950 text-zinc-800 dark:text-slate-50 w-full">
        <router-view v-slot="{ Component }">
          <KeepAlive include="CatalogView">
            <component :is="Component" />
          </KeepAlive>
        </router-view>
    </main>
  </div>
</template>

<style>
body, html {
  @reference "../../assets/base.css";

  @apply bg-white;
}
</style>
