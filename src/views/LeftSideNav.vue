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
  title: string
  abbr?: string
  name?: string
  children?: Array<NavigationItem>
}

function abbreviated(link: NavigationItem): string {
  // We'll take the first letter of each word in the title, unless it's overridden
  if (link.abbr) {
    return link.abbr
  }

  return link.title.split(" ").map((word: string) => {
    return word[0].toUpperCase()
  }).join("")
}

const links = ref<Array<NavigationItem>>([
  {
    name: 'dashboards',
    title: 'Dashboards',
  },
  {
    name: 'system:overview',
    title: 'System',
    abbr: 'SYS',
  },
  {
    name: 'controls:index',
    title: 'Controls',
    abbr: 'CON',
  },
  {
    name: 'risks:index',
    title: 'Risk Register',
    abbr: 'RIS',
  },
  {
    name: 'inventory:index',
    title: 'Inventory',
    abbr: 'INV',
  },
  {
    name: 'evidence:index',
    title: 'Evidence',
    abbr: 'EV',
  },
  {
    title: 'Implementation',
    children: [
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
        title: 'POA&M',
        abbr: 'PM',
      },
    ]
  },
  {
    title: 'Admin',
    children: [
      {
        name: 'catalog-list',
        title: 'Catalogs',
        abbr: 'CAT',
      },
      {
        name: 'profile-list',
        title: 'Profiles',
        abbr: 'PR',
      },
      {
        name: 'component-definitions',
        title: 'Component Definitions',
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
    id="app-sidenav"
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

    <div class="overflow-y-auto max-h-full grow flex flex-col justify-between">
      <!-- Top items -->
      <div>
        <!-- Main Navigation Items -->
        <template
          v-for="link in links"
          :key="link.name"
        >
          <SideNavCategory :title="link.title" v-if="link.children">
            <template
              v-for="child in link.children"
              :key="child.name"
            >
              <SideNavLink :to="{ name: child.name }" v-tooltip.right="{value: `${link.title} | ${child.title}`, disabled: sidebarStore.open}">
                {{ sidebarStore.open ? child.title : abbreviated(child) }}
              </SideNavLink>
            </template>
          </SideNavCategory>
          <SideNavLink v-else :to="{ name: link.name }" v-tooltip.hover.right="{value: link.title, disabled: sidebarStore.open}">
            {{ sidebarStore.open ? link.title : abbreviated(link) }}
          </SideNavLink>
        </template>
      </div>

      <!-- Bottom Items -->
      <div>
        <template
          v-for="link in footLinks"
          :key="link.name"
        >
          <SideNavLink :to="{ name: link.name }" v-tooltip.right="{value: link.title, disabled: sidebarStore.open}">
            {{ sidebarStore.open ? link.title : abbreviated(link) }}
          </SideNavLink>
        </template>
      </div>
    </div>
  </SideNav>
</template>

<style>
@reference "@/assets/main.css";

#app-sidenav .router-link-active {
  @apply bg-linear-to-r from-slate-200 to-slate-100 border-l-slate-300 dark:from-slate-700 dark:to-slate-800 dark:border-slate-500 dark:text-slate-200;
}
</style>
