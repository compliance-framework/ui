<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import LeftSideNav from '@/views/LeftSideNav.vue';
import SidebarToggle from '@/components/navigation/SidebarToggle.vue';
import ProfileDropdown from '@/components/ProfileDropdown.vue';
import ActiveSystemSelector from '@/components/system/ActiveSystemSelector.vue';
import { useSidebarStore } from '@/stores/sidebar';
import { useUserStore } from '@/stores/auth';
import { usePermissionsStore } from '@/stores/permissions';
import { useSystemStore } from '@/stores/system';

const sidebarStore = useSidebarStore();
const userStore = useUserStore();
const permissionsStore = usePermissionsStore();
const systemStore = useSystemStore();

// Many system-scoped pages read the active SSP once at setup. Keying them on it remounts
// the current page when the user switches systems from the header, so they follow the
// switch without each one watching the store. Global pages share one constant key, so a
// switch there doesn't reload a page that doesn't depend on it.
const route = useRoute();
const activeSystemScoped = computed(() =>
  route.matched.some((record) => record.meta.activeSystemScoped),
);
const activeSystemKey = computed(() =>
  activeSystemScoped.value
    ? `system:${systemStore.system.securityPlan?.uuid ?? 'none'}`
    : 'global',
);

// Auth is persisted, so on a hard refresh the user stays authenticated without re-running
// the login hydration. Refresh the permission hints here so gating reflects current policy
// (BCH-1318). Non-blocking — hydrate() swallows its own errors and can() stays optimistic.
onMounted(() => {
  if (userStore.isAuthenticated) {
    permissionsStore.hydrate();
  }
});
</script>

<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
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

      <!-- Toggle Button -->
      <SidebarToggle />
    </div>

    <!-- Main Content -->
    <main
      class="grow transition-all duration-300 ease-in-out bg-zinc-50 dark:bg-slate-950 text-zinc-800 dark:text-slate-50 overflow-auto"
      :class="{
        'ml-80': sidebarStore.open,
        'ml-24': !sidebarStore.open,
      }"
    >
      <!-- Header -->
      <header
        class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 relative z-40"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <ActiveSystemSelector />
          </div>

          <!-- Profile Dropdown -->
          <ProfileDropdown />
        </div>
      </header>

      <!-- Page Content -->
      <div class="px-12 py-4">
        <router-view v-slot="{ Component }">
          <KeepAlive include="CatalogView">
            <component :is="Component" :key="activeSystemKey" />
          </KeepAlive>
        </router-view>
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
