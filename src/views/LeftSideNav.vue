<script setup lang="ts">
import SideNavCategory from '@/components/navigation/SideNavCategory.vue'
import SideNav from '@/components/navigation/SideNav.vue'
import SideNavLink from '@/components/navigation/SideNavLink.vue'
import SideNavLogo from '@/components/navigation/SideNavLogo.vue'
import logo from '@/assets/logo.svg'
</script>

<template>
  <SideNav class="px-8 overflow-x-auto">
    <template #logo>
      <div class="py-6">
        <SideNavLogo alt="Vue logo" :src="logo" class="max-h-14 mx-auto"/>
      </div>
    </template>

    <div class="bg-zinc-100 h-0.5 mb-2"></div>

    <SideNavLink :to="{ name: 'home' }">Home</SideNavLink>
    <SideNavLink :to="{ name: 'about' }">About</SideNavLink>

    <SideNavCategory title="First Category">
      <SideNavLink :to="{ name: 'home' }">Home</SideNavLink>
      <SideNavLink :to="{ name: 'about' }">About</SideNavLink>
    </SideNavCategory>

    <SideNavCategory title="Second Category">
      <SideNavLink :to="{ name: 'home' }">Home</SideNavLink>
      <SideNavLink :to="{ name: 'about' }">About</SideNavLink>
    </SideNavCategory>

    <SideNavCategory title="Third Category">
      <SideNavLink :to="{ name: 'home' }">Home</SideNavLink>
      <SideNavLink :to="{ name: 'about' }">About</SideNavLink>
      <SideNavLink :to="{ name: 'home' }">Assessments</SideNavLink>
      <SideNavLink :to="{ name: 'about' }">Analytics</SideNavLink>
      <SideNavLink :to="{ name: 'home' }">Pages</SideNavLink>
      <SideNavLink :to="{ name: 'about' }">Something else for real</SideNavLink>
    </SideNavCategory>
  </SideNav>
</template>
