<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/stores/auth';

type NavItem = {
  index: string;
  label: string;
  to: { name: string };
  exactPaths?: string[];
  pathPrefixes: string[];
};

const route = useRoute();
const userStore = useUserStore();

const navItems: NavItem[] = [
  {
    index: '01',
    label: 'Dashboards',
    to: { name: 'dashboards' },
    exactPaths: ['/'],
    pathPrefixes: [
      '/dashboards',
      '/system-security-plans',
      '/assessment-plans',
      '/assessment-results',
      '/plan-of-action-and-milestones',
    ],
  },
  {
    index: '02',
    label: 'System',
    to: { name: 'system:overview' },
    pathPrefixes: ['/system'],
  },
  {
    index: '03',
    label: 'Controls',
    to: { name: 'controls:index' },
    pathPrefixes: ['/controls'],
  },
  {
    index: '04',
    label: 'Workflows',
    to: { name: 'workflow:index' },
    pathPrefixes: [
      '/workflows',
      '/workflow-definitions',
      '/workflow-instances',
      '/workflow-executions',
    ],
  },
  {
    index: '05',
    label: 'My Tasks',
    to: { name: 'my-tasks' },
    pathPrefixes: ['/my-tasks'],
  },
  {
    index: '06',
    label: 'Evidence',
    to: { name: 'evidence:index' },
    pathPrefixes: ['/evidence'],
  },
  {
    index: '07',
    label: 'Inventory',
    to: { name: 'inventory:index' },
    pathPrefixes: ['/inventory'],
  },
];

const userLabel = computed(() => {
  const email = userStore.user?.email;
  if (email) {
    return email.split('@')[0].toUpperCase();
  }
  return 'ADMIN';
});

function isActive(item: NavItem): boolean {
  if (item.exactPaths?.includes(route.path)) {
    return true;
  }
  return item.pathPrefixes.some((prefix) => route.path.startsWith(prefix));
}
</script>

<template>
  <aside
    class="hidden h-[calc(100vh-64px)] w-[240px] shrink-0 overflow-y-auto border-r border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] lg:sticky lg:top-16 lg:flex lg:flex-col"
  >
    <div class="px-4 pt-6 pb-4">
      <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
        Navigation
      </p>
    </div>

    <nav class="px-4">
      <RouterLink
        v-for="item in navItems"
        :key="item.label"
        :to="item.to"
        class="ui-v2-nav flex items-center gap-3 border-b border-[var(--ui-v2-border)] px-3 py-2 text-[var(--ui-v2-secondary-foreground)] transition-colors"
        :class="
          isActive(item)
            ? 'border-l-[3px] border-l-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] text-[var(--ui-v2-foreground)]'
            : 'hover:text-[var(--ui-v2-foreground)]'
        "
      >
        <span
          class="font-semibold"
          :class="isActive(item) ? 'text-[var(--ui-v2-primary)]' : ''"
        >
          {{ item.index }}
        </span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="mt-auto border-t border-[var(--ui-v2-border)] px-4 py-3">
      <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">User</p>
      <p class="ui-v2-nav mt-1 text-[var(--ui-v2-foreground)]">
        {{ userLabel }}
      </p>
      <p class="ui-v2-meta mt-2 text-[var(--ui-v2-tertiary-foreground)]">
        LATE 2026
      </p>
    </div>
  </aside>
</template>
