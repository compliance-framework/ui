<script setup lang="ts">
import { RouterView } from 'vue-router';
import LeftSideNav from '@/views/LeftSideNav.vue';
import SidebarToggle from '@/components/navigation/SidebarToggle.vue';
import ProfileDropdown from '@/components/ProfileDropdown.vue';
import { useSidebarStore } from '@/stores/sidebar';

const sidebarStore = useSidebarStore();
</script>

<template>
  <div class="flex h-screen">
    <div
      class="fixed top-0 left-0 h-full transition-all duration-300 ease-in-out z-10"
      :class="{
        'w-80': sidebarStore.open,
        'w-24': !sidebarStore.open,
      }"
    >
      <LeftSideNav
        class="h-full w-full transition-all duration-300 ease-in-out"
      />

      <SidebarToggle />
    </div>

    <main
      class="grow transition-all duration-300 ease-in-out bg-zinc-50 dark:bg-slate-950 text-zinc-800 dark:text-slate-50 overflow-auto"
      :class="{
        'ml-80': sidebarStore.open,
        'ml-24': !sidebarStore.open,
      }"
    >
      <header
        class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 relative z-40"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1"></div>
          <ProfileDropdown />
        </div>
      </header>

      <div class="px-12 py-4">
        <RouterView v-slot="{ Component }">
          <KeepAlive include="CatalogView">
            <component :is="Component" />
          </KeepAlive>
        </RouterView>
      </div>
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
