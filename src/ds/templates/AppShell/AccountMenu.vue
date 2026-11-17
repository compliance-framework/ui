<script setup lang="ts">
import { computed } from 'vue';
import Icon from '@/ds/components/Icon/Icon.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import { useTheme } from '@/composables/useTheme';
import { useUserStore } from '@/stores/auth';

/**
 * The signed-in user's menu (preferences, theme, sign out) at the foot of the navigation.
 * `compact` shows the avatar alone, for the rail.
 */
const props = withDefaults(defineProps<{ compact?: boolean }>(), {
  compact: false,
});

const userStore = useUserStore();
const { theme, isSystemTheme, toggleTheme, useSystemValue } = useTheme();

const userName = computed(() => {
  const user = userStore.user;
  return (
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.email ||
    'Unknown user'
  );
});
const initials = computed(() => {
  const user = userStore.user;
  return (
    `${user?.firstName?.trim()[0] ?? ''}${user?.lastName?.trim()[0] ?? ''}`.toUpperCase() ||
    'U'
  );
});

const themeChoice = computed(() =>
  isSystemTheme.value ? 'system' : theme.value,
);
function chooseTheme(value: string): void {
  if (value === 'system') return useSystemValue();
  // toggleTheme flips the theme and pins it as an explicit choice; flipping twice pins the current one.
  if (value !== theme.value) toggleTheme();
  else if (isSystemTheme.value) {
    toggleTheme();
    toggleTheme();
  }
}

const items = computed<MenuEntry[]>(() => [
  { label: 'Preferences', icon: 'preferences', to: { name: 'preferences' } },
  {
    type: 'radio',
    label: 'Theme',
    value: themeChoice.value,
    options: [
      { value: 'light', label: 'Light', icon: 'themeLight' },
      { value: 'dark', label: 'Dark', icon: 'themeDark' },
      { value: 'system', label: 'Match system', icon: 'themeSystem' },
    ],
    onChange: chooseTheme,
  },
  { type: 'separator' },
  { label: 'Sign out', icon: 'signOut', to: { name: 'logout' } },
]);
</script>

<template>
  <Menu
    :label="`Account menu, ${userName}`"
    :items="items"
    :side="props.compact ? 'right' : 'top'"
  >
    <template #trigger>
      <button
        type="button"
        class="account"
        :class="{ 'account--compact': props.compact }"
      >
        <!-- Named by hidden text rather than aria-label, so the name always includes what is
             visible (WCAG 2.5.3) even when the name is hidden in the rail. -->
        <span class="visually-hidden">Account menu, {{ userName }}</span>
        <span class="account__avatar" aria-hidden="true">{{ initials }}</span>
        <template v-if="!props.compact">
          <span class="account__name" aria-hidden="true">{{ userName }}</span>
          <Icon name="expand" />
        </template>
      </button>
    </template>
    <template #header>
      <span class="account__menu-name">{{ userName }}</span>
      <span class="account__menu-meta">{{ userStore.user?.email }}</span>
    </template>
  </Menu>
</template>

<style scoped>
.account {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: var(--ds-space-2);
  height: var(--ds-size-control-md);
  padding: 0 var(--ds-space-2);
  border: var(--ds-border-width) solid transparent;
  background: transparent;
  color: var(--ds-color-text-primary);
  font-size: var(--ds-font-size-body);
  font-weight: var(--ds-font-weight-medium);
  text-align: left;
  cursor: pointer;
}

.account--compact {
  flex: none;
  justify-content: center;
  padding: 0;
}

.account:hover {
  background: var(--ds-color-surface-hover);
}

.account__avatar {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: var(--ds-size-control-sm);
  height: var(--ds-size-control-sm);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-round);
  background: var(--ds-color-surface-sunken);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
}

.account__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account__menu-name {
  display: block;
  font-weight: var(--ds-font-weight-bold);
}

.account__menu-meta {
  display: block;
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
}
</style>
