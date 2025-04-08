<script setup lang="ts">
import SideNavCategory from '@/components/navigation/SideNavCategory.vue'
import SideNav from '@/components/navigation/SideNav.vue'
import SideNavLink from '@/components/navigation/SideNavLink.vue'
import SideNavLogo from '@/components/navigation/SideNavLogo.vue'
import logo from '@/assets/logo.svg'
</script>

<template>
  <SideNav class="flex flex-col max-h-screen border-r">
    <template #logo>
      <div class="px-8 py-8">
        <SideNavLogo alt="Vue logo" :src="logo" class="w-full"/>
      </div>
    </template>

    <div class="overflow-y-auto max-h-full grow">
      <SideNavLink class="pl-6" :to="{ name: 'dashboards' }">Dashboards</SideNavLink>
      <SideNavLink class="pl-6" :to="{ name: 'catalog-list' }">Catalogs</SideNavLink>
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
    </div>
  </SideNav>
</template>

<style>
.router-link {
  @apply border-l-transparent border-l-8 text-zinc-700;
}
.router-link-exact-active {
  @apply bg-gradient-to-r from-slate-200 to-slate-100 border-l-slate-300;
}
</style>
