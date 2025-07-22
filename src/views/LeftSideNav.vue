<script setup lang="ts">
import SideNavCategory from '@/components/navigation/SideNavCategory.vue'
import SideNav from '@/components/navigation/SideNav.vue'
import SideNavLink from '@/components/navigation/SideNavLink.vue'
import SideNavLogo from '@/components/navigation/SideNavLogo.vue'
import lightLogo from '@/assets/logo-light.svg'
import darkLogo from '@/assets/logo-dark.svg'
import lightMiniLogo from '@/assets/logo-light-mini.svg'
import darkMiniLogo from '@/assets/logo-dark-mini.svg'
import { useSidebarStore } from '@/stores/sidebar'
import { ref } from 'vue'

const sidebarStore = useSidebarStore()

interface NavigationItem {
  name: string
  title: string
  children?: Array<NavigationItem>
}

const links = ref<Array<NavigationItem>>([
  {
    name: 'dashboards',
    title: 'Dashboards',
  },
  {
    name: 'evidence:index',
    title: 'Evidence',
  },
  {
    name: 'catalog-list',
    title: 'Catalogs',
  },
  {
    name: 'profile-list',
    title: 'Profiles',
  },
  {
    name: 'component-definitions',
    title: 'Component Definitions',
  },
  {
    name: 'system-security-plans',
    title: 'System Security Plans',
  },
  {
    name: 'assessment-plans',
    title: 'Assessment Plans',
  },
  {
    name: 'plan-of-action-and-milestones',
    title: 'Plan of Action and Milestones',
  },
  {
    name: 'admin-parties',
    title: 'Parties',
  },
  {
    name: 'admin-roles',
    title: 'Roles',
  },
  {
    name: 'admin-subjects',
    title: 'Subjects',
  }
]);

const footLinks = ref<Array<NavigationItem>>([
  {
    name: 'logout',
    title: 'Logout',
  }
])
</script>

<template>
  <SideNav
    class="flex flex-col max-h-screen border-r border-r-ccf-300 dark:border-slate-700 bg-white dark:bg-slate-900 max-w-80"
  >
    <template #logo>
      <div
        class="py-8 transition-all duration-300 ease-in-out"
        :class="{
          'px-8': sidebarStore.open,
          'px-2': !sidebarStore.open
        }"
      >
        <!-- Light mode logos -->
        <SideNavLogo
          alt="Vue logo"
          :src="!sidebarStore.open ? lightMiniLogo : lightLogo"
          :class="!sidebarStore.open ? 'w-12 mx-auto' : 'w-full'"
          class="block dark:hidden transition-all duration-300"
        />

        <!-- Dark mode logos -->
        <SideNavLogo
          alt="Vue logo"
          :src="!sidebarStore.open ? darkMiniLogo : darkLogo"
          :class="!sidebarStore.open ? 'w-12 mx-auto' : 'w-full'"
          class="hidden dark:block transition-all duration-300"
        />
      </div>
    </template>

    <div class="overflow-y-auto max-h-full grow">
      <!-- Main Navigation Items -->
      <SideNavLink
        v-for="link in links"
        :key="link.name"
        :to="{ name: link.name }"
        :title="!sidebarStore.open ? link.title : undefined"
      >
        <span v-if="sidebarStore.open">{{ link.title }}</span>
        <div v-else class="relative group">
          <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
            {{ link.title }}
          </div>
        </div>
      </SideNavLink>

      <!-- Logout -->
      <SideNavLink
        v-for="link in footLinks"
        :key="link.name"
        :to="{ name: link.name }"
        :title="!sidebarStore.open ? link.title : undefined"
      >
        <span v-if="sidebarStore.open">{{ link.title }}</span>
        <div v-else class="relative group">
          <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap z-50">
            {{ link.title }}
          </div>
        </div>
      </SideNavLink>
    </div>
  </SideNav>
</template>

<style>
@reference "@/assets/main.css";

.router-link {
  @apply border-l-transparent border-l-8 text-zinc-700 dark:text-slate-200;
}
.router-link-exact-active {
  @apply bg-linear-to-r from-slate-200 to-slate-100 border-l-slate-300 dark:from-slate-700 dark:to-slate-800 dark:border-slate-500 dark:text-slate-200;
}
</style>
