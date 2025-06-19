<script setup lang="ts">
import SideNavCategory from '@/components/navigation/SideNavCategory.vue'
import SideNav from '@/components/navigation/SideNav.vue'
import SideNavLink from '@/components/navigation/SideNavLink.vue'
import SideNavLogo from '@/components/navigation/SideNavLogo.vue'
import lightLogo from '@/assets/logo-light.svg'
import darkLogo from '@/assets/logo-dark.svg'
import { useUserStore } from '@/stores/auth'

const userStore = useUserStore()
</script>

<template>
  <SideNav class="flex flex-col max-h-screen border-r border-r-ccf-300  dark:border-slate-700 bg-white dark:bg-slate-900">
    <template #logo>
      <div class="px-8 py-8">
        <SideNavLogo alt="Vue logo" :src="lightLogo" class="w-full dark:hidden"/>
        <SideNavLogo alt="Vue logo" :src="darkLogo" class="w-full hidden dark:block"/>
      </div>
    </template>
    <template v-if="userStore.isAuthenticated">
      <div class="overflow-y-auto max-h-full grow">
        <SideNavLink class="pl-6" :to="{ name: 'dashboards' }">Dashboards</SideNavLink>
        <SideNavLink class="pl-6" :to="{ name: 'catalog-list' }">Catalogs</SideNavLink>
        <SideNavLink class="pl-6" :to="{ name: 'system-security-plans' }">System Security Plans</SideNavLink>
        <SideNavLink class="pl-6" :to="{ name: 'admin-parties' }">Parties</SideNavLink>
        <SideNavLink class="pl-6" :to="{ name: 'admin-roles' }">Roles</SideNavLink>
        <SideNavCategory title="Findings (Evidence)">
          <SideNavLink :to="{ name: 'findings' }">All</SideNavLink>
          <SideNavLink :to="{ name: 'findings-by-subject' }">By Subject</SideNavLink>
          <SideNavLink :to="{ name: 'list-classes-of-findings' }">By Control Class</SideNavLink>
        </SideNavCategory>
        <SideNavCategory title="Admin">
          <SideNavLink :to="{ name: 'admin-subjects' }">Subjects</SideNavLink>
        </SideNavCategory>
        <SideNavCategory title="Continuous Compliance">
          <SideNavLink :to="{ name: 'about' }">About</SideNavLink>
          <SideNavLink :to="{ name: 'home' }">Docs</SideNavLink>
        </SideNavCategory>
        <SideNavLink :to="{ name: 'logout' }">Logout</SideNavLink>
      </div>
    </template>
    <template v-else>
      <div class="overflow-y-auto max-h-full grow">
        <SideNavLink class="pl-6" :to="{ name: 'login' }">Login</SideNavLink>
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
