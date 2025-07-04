<script setup lang="ts">
import SideNavCategory from '@/components/navigation/SideNavCategory.vue'
import SideNav from '@/components/navigation/SideNav.vue'
import SideNavLink from '@/components/navigation/SideNavLink.vue'
import SideNavLogo from '@/components/navigation/SideNavLogo.vue'
import lightLogo from '@/assets/logo-light.svg'
import darkLogo from '@/assets/logo-dark.svg'
import { useUserStore } from '@/stores/auth'
import { useSidebarStore } from '@/stores/sidebar'

const userStore = useUserStore()
const sidebarStore = useSidebarStore()
</script>

<template>
  <SideNav
    class="flex flex-col max-h-screen border-r border-r-ccf-300 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out"
    :class="{
      'w-80': !sidebarStore.isCollapsed,
      'w-16': sidebarStore.isCollapsed
    }"
  >
    <template #logo>
      <div
        class="px-8 py-8 transition-all duration-300 ease-in-out"
        :class="{
          'px-8': !sidebarStore.isCollapsed,
          'px-2': sidebarStore.isCollapsed
        }"
      >
        <SideNavLogo
          alt="Vue logo"
          :src="lightLogo"
          class="w-full dark:hidden transition-all duration-300"
          :class="{
            'w-full': !sidebarStore.isCollapsed,
            'w-12': sidebarStore.isCollapsed
          }"
        />
        <SideNavLogo
          alt="Vue logo"
          :src="darkLogo"
          class="w-full hidden dark:block transition-all duration-300"
          :class="{
            'w-full': !sidebarStore.isCollapsed,
            'w-12': sidebarStore.isCollapsed
          }"
        />
      </div>
    </template>

    <template v-if="userStore.isAuthenticated">
      <div class="overflow-y-auto max-h-full grow">
        <!-- Dashboard -->
        <SideNavLink
          :to="{ name: 'dashboards' }"
          :title="sidebarStore.isCollapsed ? 'Dashboards' : undefined"
        >
          <span v-if="!sidebarStore.isCollapsed">Dashboards</span>
          <div v-else class="relative group">
            <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
              Dashboards
            </div>
          </div>
        </SideNavLink>

        <!-- Catalogs -->
        <SideNavLink
          :to="{ name: 'catalog-list' }"
          :title="sidebarStore.isCollapsed ? 'Catalogs' : undefined"
        >
          <span v-if="!sidebarStore.isCollapsed">Catalogs</span>
          <div v-else class="relative group">
            <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
              Catalogs
            </div>
          </div>
        </SideNavLink>

        <!-- Component Definitions -->
        <SideNavLink
          :to="{ name: 'component-definitions' }"
          :title="sidebarStore.isCollapsed ? 'Component Definitions' : undefined"
        >
          <span v-if="!sidebarStore.isCollapsed">Component Definitions</span>
          <div v-else class="relative group">
            <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
              Component Definitions
            </div>
          </div>
        </SideNavLink>

        <!-- System Security Plans -->
        <SideNavLink
          :to="{ name: 'system-security-plans' }"
          :title="sidebarStore.isCollapsed ? 'System Security Plans' : undefined"
        >
          <span v-if="!sidebarStore.isCollapsed">System Security Plans</span>
          <div v-else class="relative group">
            <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
              System Security Plans
            </div>
          </div>
        </SideNavLink>

        <!-- Plan of Action and Milestones -->
        <SideNavLink
          :to="{ name: 'plan-of-action-and-milestones' }"
          :title="sidebarStore.isCollapsed ? 'Plan of Action and Milestones' : undefined"
        >
          <span v-if="!sidebarStore.isCollapsed">Plan of Action and Milestones</span>
          <svg v-else class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </SideNavLink>

        <!-- Parties -->
        <SideNavLink
          :to="{ name: 'admin-parties' }"
          :title="sidebarStore.isCollapsed ? 'Parties' : undefined"
        >
          <span v-if="!sidebarStore.isCollapsed">Parties</span>
          <div v-else class="relative group">
            <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
              Parties
            </div>
          </div>
        </SideNavLink>

        <!-- Roles -->
        <SideNavLink
          :to="{ name: 'admin-roles' }"
          :title="sidebarStore.isCollapsed ? 'Roles' : undefined"
        >
          <span v-if="!sidebarStore.isCollapsed">Roles</span>
          <div v-else class="relative group">
            <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
              Roles
            </div>
          </div>
        </SideNavLink>

        <!-- Findings Category -->
        <SideNavCategory
          v-if="!sidebarStore.isCollapsed"
          title="Findings (Evidence)"
        >
          <SideNavLink :to="{ name: 'findings' }">All</SideNavLink>
          <SideNavLink :to="{ name: 'findings-by-subject' }">By Subject</SideNavLink>
          <SideNavLink :to="{ name: 'list-classes-of-findings' }">By Control Class</SideNavLink>
        </SideNavCategory>

        <!-- Findings in collapsed state -->
        <template v-else>
          <div class="text-zinc-500 dark:text-slate-400 py-2 pl-2 text-center text-xs" title="Findings (Evidence)">
            <svg class="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <SideNavLink
            :to="{ name: 'findings' }"
            title="All Findings"
          >
            <div class="relative group">
              <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
                All Findings
              </div>
            </div>
          </SideNavLink>
          <SideNavLink
            :to="{ name: 'findings-by-subject' }"
            title="Findings by Subject"
          >
            <div class="relative group">
              <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50">
                Findings by Subject
              </div>
            </div>
          </SideNavLink>
          <SideNavLink
            :to="{ name: 'list-classes-of-findings' }"
            title="Findings by Control Class"
          >
            <div class="relative group">
              <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap z-50">
                Findings by Control Class
              </div>
            </div>
          </SideNavLink>
        </template>

        <!-- Admin Category -->
        <SideNavCategory
          v-if="!sidebarStore.isCollapsed"
          title="Admin"
        >
          <SideNavLink :to="{ name: 'admin-subjects' }">Subjects</SideNavLink>
        </SideNavCategory>

        <!-- Admin in collapsed state -->
        <template v-else>
          <div class="text-zinc-500 dark:text-slate-400 py-2 pl-2 text-center text-xs" title="Admin">
            <svg class="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <SideNavLink
            :to="{ name: 'admin-subjects' }"
            title="Subjects"
          >
            <div class="relative group">
              <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap z-50">
                Subjects
              </div>
            </div>
          </SideNavLink>
        </template>

        <!-- Continuous Compliance Category -->
        <SideNavCategory
          v-if="!sidebarStore.isCollapsed"
          title="Continuous Compliance"
        >
          <SideNavLink :to="{ name: 'about' }">About</SideNavLink>
          <SideNavLink :to="{ name: 'home' }">Docs</SideNavLink>
        </SideNavCategory>

        <!-- Continuous Compliance in collapsed state -->
        <template v-else>
          <div class="text-zinc-500 dark:text-slate-400 py-2 pl-2 text-center text-xs" title="Continuous Compliance">
            <svg class="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <SideNavLink
            :to="{ name: 'about' }"
            title="About"
          >
            <div class="relative group">
              <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap z-50">
                About
              </div>
            </div>
          </SideNavLink>
          <SideNavLink
            :to="{ name: 'home' }"
            title="Docs"
          >
            <div class="relative group">
              <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap z-50">
                Docs
              </div>
            </div>
          </SideNavLink>
        </template>

        <!-- Logout -->
        <SideNavLink
          :to="{ name: 'logout' }"
          :title="sidebarStore.isCollapsed ? 'Logout' : undefined"
        >
          <span v-if="!sidebarStore.isCollapsed">Logout</span>
          <div v-else class="relative group">
            <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap z-50">
              Logout
            </div>
          </div>
        </SideNavLink>
      </div>
    </template>

    <template v-else>
      <div class="overflow-y-auto max-h-full grow">
        <SideNavLink
          :to="{ name: 'login' }"
          :title="sidebarStore.isCollapsed ? 'Login' : undefined"
        >
          <span v-if="!sidebarStore.isCollapsed">Login</span>
          <div v-else class="relative group">
            <svg class="w-5 h-5 text-gray-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-100 whitespace-nowrap z-50">
              Login
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
