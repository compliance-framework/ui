<script setup lang="ts">
import SideNavCategory from '@/components/navigation/SideNavCategory.vue';
import SideNav from '@/components/navigation/SideNav.vue';
import SideNavLink from '@/components/navigation/SideNavLink.vue';
import SideNavLogo from '@/components/navigation/SideNavLogo.vue';
import lightLogo from '@/assets/logo-light.svg';
import darkLogo from '@/assets/logo-dark.svg';
import lightMiniLogo from '@/assets/logo-light-mini.svg';
import darkMiniLogo from '@/assets/logo-dark-mini.svg';
import { useSidebarStore } from '@/stores/sidebar';
import { useSystemStore } from '@/stores/system';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const sidebarStore = useSidebarStore();
const systemStore = useSystemStore();
const { can } = usePermissions();
const route = useRoute();
const router = useRouter();

interface NavigationItem {
  title: string;
  abbr?: string;
  name?: string;
  // Hide this entry unless the subject may perform (resource, action). Items without a
  // permission are always shown. Admin entries gate on admin:manage (BCH-1318).
  permission?: { resource: string; action: string };
  children?: Array<NavigationItem>;
}

const ADMIN_MANAGE = { resource: RESOURCES.ADMIN, action: ACTIONS.MANAGE };

function abbreviated(link: NavigationItem): string {
  // We'll take the first letter of each word in the title, unless it's overridden
  if (link.abbr) {
    return link.abbr;
  }

  return link.title
    .split(' ')
    .map((word: string) => {
      return word[0].toUpperCase();
    })
    .join('');
}

interface NavigationSection {
  // Heading shown above the section's entries (a divider when the sidebar is collapsed).
  title: string;
  links: Array<NavigationItem>;
}

// The nav is split by scope so a user always knows what a page is about: "This System"
// pages all follow the system picked in the header's Active System menu (its Evidence
// lists only that system's in-scope evidence), while "Global" pages are shared across
// every system (its Evidence lists all evidence).
const sections: Array<NavigationSection> = [
  {
    title: 'This System',
    links: [
      {
        name: 'system:evidence',
        title: 'Evidence',
        abbr: 'EV',
        // The scoped evidence routes are guarded as SSP reads.
        permission: { resource: RESOURCES.SSP, action: ACTIONS.READ },
      },
      {
        name: 'controls:index',
        title: 'Implementation',
        abbr: 'IMP',
      },
      {
        name: 'compliance:index',
        title: 'Compliance',
        abbr: 'COM',
      },
      {
        name: 'risks:index',
        title: 'Risks',
        abbr: 'RIS',
        permission: { resource: RESOURCES.RISK, action: ACTIONS.READ },
      },
      {
        name: 'workflow-instances:index',
        title: 'Workflow Instances',
        abbr: 'WI',
        permission: {
          resource: RESOURCES.WORKFLOW_INSTANCE,
          action: ACTIONS.READ,
        },
      },
      {
        name: 'system:overview',
        title: 'Configure System',
        abbr: 'CFG',
      },
    ],
  },
  {
    title: 'Global',
    links: [
      {
        name: 'evidence:index',
        title: 'Evidence',
        abbr: 'EV',
        permission: { resource: RESOURCES.EVIDENCE, action: ACTIONS.READ },
      },
      {
        title: 'Analysis',
        abbr: 'AN',
        children: [
          {
            name: 'admin-risks',
            title: 'Risks',
            abbr: 'RIS',
            permission: ADMIN_MANAGE,
          },
          {
            name: 'lineage',
            title: 'Compliance Map',
            abbr: 'CM',
          },
        ],
      },
      {
        title: 'Integrations',
        abbr: 'INT',
        children: [
          {
            name: 'workflow:index',
            title: 'Workflow Definitions',
            abbr: 'WD',
            permission: {
              resource: RESOURCES.WORKFLOW_DEFINITION,
              action: ACTIONS.READ,
            },
          },
          {
            name: 'dashboards',
            title: 'Evidence Filters',
            abbr: 'FIL',
            permission: { resource: RESOURCES.FILTER, action: ACTIONS.READ },
          },
          {
            name: 'admin-agents',
            title: 'Agents',
            abbr: 'AG',
            // R40: agent:read, like the route.
            permission: { resource: RESOURCES.AGENT, action: ACTIONS.READ },
          },
          {
            name: 'admin-import',
            title: 'Import',
            abbr: 'IMP',
            permission: ADMIN_MANAGE,
          },
        ],
      },
      {
        title: 'Control Definitions',
        abbr: 'CD',
        children: [
          {
            name: 'catalog-list',
            title: 'Catalogs',
            abbr: 'CAT',
            permission: { resource: RESOURCES.CATALOG, action: ACTIONS.READ },
          },
          {
            name: 'profile-list',
            title: 'Profiles',
            abbr: 'PR',
            permission: { resource: RESOURCES.PROFILE, action: ACTIONS.READ },
          },
          {
            name: 'control-links-list',
            title: 'Control Links',
            abbr: 'CL',
            permission: {
              resource: RESOURCES.CONTROL_LINK,
              action: ACTIONS.READ,
            },
          },
        ],
      },
      {
        title: 'Admin',
        children: [
          {
            name: 'users-list',
            title: 'Users',
            permission: ADMIN_MANAGE,
          },
          {
            name: 'admin-groups',
            title: 'Groups',
            permission: ADMIN_MANAGE,
          },
          {
            name: 'admin-ssp-templates',
            title: 'System Templates',
            permission: ADMIN_MANAGE,
          },
          {
            name: 'admin-diagnostics',
            title: 'Diagnostics',
            abbr: 'DIAG',
            permission: ADMIN_MANAGE,
          },
        ],
      },
    ],
  },
];

// Every top-level entry across both sections, in display order, for active-route matching.
const links = computed<Array<NavigationItem>>(() =>
  sections.flatMap((section) => section.links),
);

const activeSystemName = computed(
  () => systemStore.system.securityPlan?.metadata?.title,
);

function itemAllowed(item: NavigationItem): boolean {
  if (!item.permission) return true;
  return can(item.permission.resource, item.permission.action);
}

// Filter nav by permission: drop denied leaf links, drop denied children, and hide a
// category entirely once it has no visible children (BCH-1318).
function visibleItems(items: Array<NavigationItem>): Array<NavigationItem> {
  return items
    .map((link) =>
      link.children
        ? { ...link, children: link.children.filter(itemAllowed) }
        : link,
    )
    .filter((link) =>
      link.children ? link.children.length > 0 : itemAllowed(link),
    );
}

// A section with nothing left to show (e.g. Global for a user who may read nothing in it)
// is dropped along with its heading.
const visibleSections = computed<Array<NavigationSection>>(() =>
  sections
    .map((section) => ({ ...section, links: visibleItems(section.links) }))
    .filter((section) => section.links.length > 0),
);

// Identifies a top-level nav entry for the sticky-active tracking below: a category by its
// (unique) title, a standalone link by its route name.
function linkKey(item: NavigationItem): string | undefined {
  return item.children ? item.title : item.name;
}

function routeIsUnder(name?: string): boolean {
  if (!name) {
    return false;
  }
  if (route.matched.some((matched) => matched.name === name)) {
    return true;
  }
  // Many sections (e.g. catalogs) are flat sibling routes — /catalogs, /catalogs/:id,
  // /catalogs/new — rather than nested child routes, so a detail/create page reached
  // directly (deep link, hard refresh) never shows up in route.matched under the list
  // route's name. Falling back to a path-prefix check lets a fresh load on such a page
  // still resolve to the right nav item without depending on any in-session state.
  try {
    const basePath = router.resolve({ name }).path;
    return route.path === basePath || route.path.startsWith(`${basePath}/`);
  } catch {
    return false;
  }
}

interface ActiveSection {
  // A category's title, or a standalone top-level link's route name.
  topLevel?: string;
  // Set only when `topLevel` is a category: the specific child route name active within
  // it, so "Governance > Catalogs" stays distinguishable from "Governance > Profiles".
  child?: string;
}

// Which nav entry, at both levels, the CURRENT route belongs to (a category whose
// children include the route anywhere in its matched chain, or a standalone link whose
// own route matches) — or undefined when the route matches nothing in the nav at all.
function matchingSection(): ActiveSection | undefined {
  for (const link of links.value) {
    if (link.children) {
      const child = link.children.find((c) => routeIsUnder(c.name));
      if (child) {
        return { topLevel: link.title, child: child.name };
      }
    } else if (routeIsUnder(link.name)) {
      return { topLevel: link.name };
    }
  }
  return undefined;
}

// The section (and, within it, the specific item) the user is "in", kept sticky at both
// levels: it only moves when navigation lands on a route that genuinely belongs to a
// different nav entry. A button inside a page pushing to some unlisted detail route (e.g.
// "New Catalog", never registered as a nav child) would otherwise match nothing and blank
// the highlight out from under the user — at either level — even though they haven't left
// that item.
const activeSection = ref<ActiveSection>(matchingSection() ?? {});
watch(
  () => route.fullPath,
  () => {
    const matched = matchingSection();
    if (matched !== undefined) {
      activeSection.value = matched;
    }
  },
);

const footLinks = ref<Array<NavigationItem>>([
  {
    name: 'logout',
    title: 'Logout',
  },
]);
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
          'px-2': !sidebarStore.open,
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
        <!-- Main Navigation Items, grouped by scope -->
        <div
          v-for="section in visibleSections"
          :key="section.title"
          role="group"
          :aria-label="section.title"
          class="mb-4"
          :data-nav-section="section.title"
        >
          <div v-if="sidebarStore.open" class="px-6 pt-2 pb-1">
            <h2
              class="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-slate-500"
            >
              {{ section.title }}
            </h2>
            <p
              v-if="section.title === 'This System'"
              class="mt-0.5 truncate text-sm text-zinc-600 dark:text-slate-300"
              :title="activeSystemName"
            >
              {{ activeSystemName || 'No system selected' }}
            </p>
          </div>
          <hr v-else class="mx-4 my-2 border-ccf-300 dark:border-slate-700" />
          <template
            v-for="link in section.links"
            :key="link.name ?? link.title"
          >
            <SideNavCategory
              :title="link.title"
              :open="linkKey(link) === activeSection.topLevel"
              :active="linkKey(link) === activeSection.topLevel"
              v-if="link.children"
            >
              <template #title>
                <span>{{
                  sidebarStore.open ? link.title : abbreviated(link)
                }}</span>
              </template>
              <template v-for="child in link.children" :key="child.name">
                <SideNavLink
                  :to="{ name: child.name }"
                  :active="child.name === activeSection.child"
                  v-tooltip.right="{
                    value: `${link.title} | ${child.title}`,
                    disabled: sidebarStore.open,
                  }"
                >
                  {{ sidebarStore.open ? child.title : abbreviated(child) }}
                </SideNavLink>
              </template>
            </SideNavCategory>
            <SideNavLink
              v-else
              :to="{ name: link.name }"
              :active="link.name === activeSection.topLevel"
              v-tooltip.hover.right="{
                value: link.title,
                disabled: sidebarStore.open,
              }"
            >
              {{ sidebarStore.open ? link.title : abbreviated(link) }}
            </SideNavLink>
          </template>
        </div>
      </div>

      <!-- Bottom Items -->
      <div>
        <template v-for="link in footLinks" :key="link.name">
          <SideNavLink
            :to="{ name: link.name }"
            v-tooltip.right="{ value: link.title, disabled: sidebarStore.open }"
          >
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
