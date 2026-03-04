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
  <nav
    class="sticky top-16 z-30 border-b border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] lg:hidden"
  >
    <div class="flex items-center justify-between px-4 pt-3">
      <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
        Navigation
      </p>
      <p class="ui-v2-nav text-[var(--ui-v2-tertiary-foreground)]">
        {{ userLabel }}
      </p>
    </div>

    <div class="overflow-x-auto px-4 pb-3 pt-2">
      <div class="flex min-w-max items-center gap-2">
        <RouterLink
          v-for="item in navItems"
          :key="item.label"
          :to="item.to"
          class="ui-v2-nav flex items-center gap-2 border px-3 py-2 whitespace-nowrap transition-colors"
          :class="
            isActive(item)
              ? 'border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] text-[var(--ui-v2-foreground)]'
              : 'border-[var(--ui-v2-border)] text-[var(--ui-v2-secondary-foreground)] hover:text-[var(--ui-v2-foreground)]'
          "
        >
          <span
            :class="
              isActive(item) ? 'font-semibold text-[var(--ui-v2-primary)]' : ''
            "
          >
            {{ item.index }}
          </span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
