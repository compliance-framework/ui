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
