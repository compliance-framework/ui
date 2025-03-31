<script setup lang="ts">
import SideNavCategory from '@/components/navigation/SideNavCategory.vue'
import SideNav from '@/components/navigation/SideNav.vue'
import SideNavLink from '@/components/navigation/SideNavLink.vue'
import SideNavLogo from '@/components/navigation/SideNavLogo.vue'
import logo from '@/assets/logo.svg'
</script>

<template>
  <SideNav class="px-8 overflow-x-auto shadow">
    <template #logo>
      <div class="py-6">
        <SideNavLogo alt="Vue logo" :src="logo" class="max-h-14 mx-auto"/>
      </div>
    </template>

    <div class="bg-zinc-100 h-0.5 mb-2"></div>
    <SideNavCategory title="Findings (Evidence)">
      <SideNavLink :to="{ name: 'findings' }">All</SideNavLink>
      <SideNavLink :to="{ name: 'findings-by-subject' }">By Subject</SideNavLink>
    </SideNavCategory>
    <SideNavCategory title="Continuous Compliance">
      <SideNavLink :to="{ name: 'about' }">About</SideNavLink>
      <SideNavLink :to="{ name: 'home' }">Docs</SideNavLink>
    </SideNavCategory>
  </SideNav>
</template>
