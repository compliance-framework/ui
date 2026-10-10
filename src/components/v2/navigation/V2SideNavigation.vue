<script setup lang="ts">
import { computed } from 'vue';
import { useV2Navigation } from '@/composables/v2/useV2Navigation';
import { useUserStore } from '@/stores/auth';

const { navItems, isActive } = useV2Navigation();
const userStore = useUserStore();

const userLabel = computed(() => {
  const email = userStore.user?.email;
  if (email) {
    return email.split('@')[0].toUpperCase();
  }
  return 'ADMIN';
});
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
    </div>
  </aside>
</template>
