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
  icon: string
  category?: string
}

interface NavigationCategory {
  title: string
  icon: string
  items: NavigationItem[]
}

const navigationConfig = computed(() => {
  const mainNav: NavigationItem[] = [
    {
      name: 'dashboards',
      title: 'Dashboards',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    },
    {
      name: 'catalog-list',
      title: 'Catalogs',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
    },
    {
      name: 'component-definitions',
      title: 'Component Definitions',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
    },
    {
      name: 'system-security-plans',
      title: 'System Security Plans',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
    },
    {
      name: 'admin-parties',
      title: 'Parties',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
    },
    {
      name: 'admin-roles',
      title: 'Roles',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    }
  ]

  const categories: NavigationCategory[] = [
    {
      title: 'Evidence',
      icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      items: [
        { name: 'evidence:index', title: 'All', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      ]
    },
    {
      title: 'Admin',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      items: [
        { name: 'admin-subjects', title: 'Subjects', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
      ]
    },
    {
      title: 'Continuous Compliance',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      items: [
        { name: 'about', title: 'About', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        { name: 'home', title: 'Docs', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' }
      ]
    }
  ]

  const logoutItem: NavigationItem = {
    name: 'logout',
    title: 'Logout',
    icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
  }

  return {
    mainNav,
    categories,
    logoutItem
  }
})

const loginItem: NavigationItem = {
  name: 'login',
  title: 'Login',
  icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1'
}
</script>

<template>
  <SideNav
    class="flex flex-col max-h-screen border-r border-r-ccf-300 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out"
    :class="{
      'w-80': sidebarStore.open,
      'w-16': !sidebarStore.open
    }"
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

    <template v-if="userStore.isAuthenticated">
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
            <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
            </svg>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
              {{ item.title }}
            </div>
          </div>
        </SideNavLink>

        <!-- Categories -->
        <template v-for="category in navigationConfig.categories" :key="category.title">
          <!-- Expanded Category -->
          <SideNavCategory
            v-if="sidebarStore.open"
            :title="category.title"
          >
            <SideNavLink
              v-for="item in category.items"
              :key="item.name"
              :to="{ name: item.name }"
            >
              {{ item.title }}
            </SideNavLink>
          </SideNavCategory>

          <!-- Collapsed Category -->
          <template v-else>
            <div class="text-zinc-500 dark:text-slate-400 py-2 pl-2 text-center text-xs" :title="category.title">
              <svg class="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="category.icon" />
              </svg>
            </div>

            <SideNavLink
              v-for="item in category.items"
              :key="item.name"
              :to="{ name: item.name }"
              :title="item.title"
            >
              <div class="relative group">
                <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
                </svg>
                <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap z-50">
                  {{ item.title }}
                </div>
              </div>
            </SideNavLink>
          </template>
        </template>

        <!-- Logout -->
        <SideNavLink
          :to="{ name: navigationConfig.logoutItem.name }"
          :title="!sidebarStore.open ? navigationConfig.logoutItem.title : undefined"
        >
          <span v-if="sidebarStore.open">{{ navigationConfig.logoutItem.title }}</span>
          <div v-else class="relative group">
            <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="navigationConfig.logoutItem.icon" />
            </svg>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap z-50">
              {{ navigationConfig.logoutItem.title }}
            </div>
          </div>
        </SideNavLink>
      </div>
    </template>

    <template v-else>
      <div class="overflow-y-auto max-h-full grow">
        <SideNavLink
          :to="{ name: loginItem.name }"
          :title="!sidebarStore.open ? loginItem.title : undefined"
        >
          <span v-if="sidebarStore.open">{{ loginItem.title }}</span>
          <div v-else class="relative group">
            <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="loginItem.icon" />
            </svg>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap z-50">
              {{ loginItem.title }}
            </div>
          </div>
        </SideNavLink>
      </div>
    </template>
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
