<script setup lang="ts">
import { RouterView } from 'vue-router'
import LeftSideNav from '@/views/LeftSideNav.vue'
import SidebarToggle from '@/components/navigation/SidebarToggle.vue'
import { useSidebarStore } from '@/stores/sidebar'

const sidebarStore = useSidebarStore()
</script>

<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <div
      class="fixed top-0 left-0 h-full transition-all duration-300 ease-in-out z-40"
      :class="{
        'w-80': !sidebarStore.isCollapsed,
        'w-16': sidebarStore.isCollapsed
      }"
    >
      <LeftSideNav
        class="h-full transition-all duration-300 ease-in-out"
        :class="{
          'w-80': !sidebarStore.isCollapsed,
          'w-16': sidebarStore.isCollapsed
        }"
      />

      <!-- Toggle Button -->
      <SidebarToggle />
    </div>
    <!-- Main Content -->
    <main
      class="flex-1 transition-all duration-300 ease-in-out px-12 py-4 bg-zinc-50 dark:bg-slate-950 text-zinc-800 dark:text-slate-50 overflow-auto"
      :class="{
        'ml-80': !sidebarStore.isCollapsed,
        'ml-16': sidebarStore.isCollapsed
      }"
    >
      <router-view v-slot="{ Component }">
        <KeepAlive include="CatalogView">
          <component :is="Component" />
        </KeepAlive>
      </router-view>
    </main>
  </div>
</template>

<style>
@reference "@/assets/main.css";

body, html {
  @apply bg-white;
}
</style>
