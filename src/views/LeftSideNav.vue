<script setup lang="ts">
import SideNavCategory from '@/components/navigation/SideNavCategory.vue'
import SideNav from '@/components/navigation/SideNav.vue'
import SideNavLink from '@/components/navigation/SideNavLink.vue'
import SideNavLogo from '@/components/navigation/SideNavLogo.vue'
import lightLogo from '@/assets/logo-light.svg'
import darkLogo from '@/assets/logo-dark.svg'
import lightMiniLogo from '@/assets/logo-light-mini.svg'
import darkMiniLogo from '@/assets/logo-dark-mini.svg'
import { useUserStore } from '@/stores/auth'
import { useSidebarStore } from '@/stores/sidebar'
import { computed } from 'vue'

const userStore = useUserStore()
const sidebarStore = useSidebarStore()

interface NavigationItem {
  name: string
  title: string
  children?: Array<NavigationItem>
}

const navigationConfig = computed(() => {
  const mainNav: NavigationItem[] = [
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
  ]

  const logoutItem: NavigationItem = {
    name: 'logout',
    title: 'Logout',
  }

  return {
    mainNav,
    logoutItem
  }
})
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
        v-for="item in navigationConfig.mainNav"
        :key="item.name"
        :to="{ name: item.name }"
        :title="!sidebarStore.open ? item.title : undefined"
      >
        <span v-if="sidebarStore.open">{{ item.title }}</span>
        <div v-else class="relative group">
          <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
            {{ item.title }}
          </div>
        </div>
      </SideNavLink>

      <!-- Logout -->
      <SideNavLink
        :to="{ name: navigationConfig.logoutItem.name }"
        :title="!sidebarStore.open ? navigationConfig.logoutItem.title : undefined"
      >
        <span v-if="sidebarStore.open">{{ navigationConfig.logoutItem.title }}</span>
        <div v-else class="relative group">
          <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap z-50">
            {{ navigationConfig.logoutItem.title }}
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
