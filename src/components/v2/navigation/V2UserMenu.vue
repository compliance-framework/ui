<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { CCFUser } from '@/stores/types';
import { useAuthenticatedInstance } from '@/composables/axios';
import { useUserStore } from '@/stores/auth';
import { useMyAssignments } from '@/composables/workflows/useMyAssignments';

const router = useRouter();
const axios = useAuthenticatedInstance();
const userStore = useUserStore();
const { getAssignmentCount } = useMyAssignments();

const dropdownRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const isLoggingOut = ref(false);
const user = ref<CCFUser | null>(null);
const taskCount = ref(0);

const userName = computed(() => {
  const resolved = user.value ?? userStore.user;
  if (!resolved) {
    return 'Unknown User';
  }

  const firstName = resolved.firstName?.trim() || '';
  const lastName = resolved.lastName?.trim() || '';
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName.length > 0) {
    return fullName;
  }

  return resolved.email;
});

const userEmail = computed(() => {
  const resolved = user.value ?? userStore.user;
  return resolved?.email || '';
});

const userInitials = computed(() => {
  const resolved = user.value ?? userStore.user;
  if (!resolved) {
    return 'U';
  }

  const firstName = resolved.firstName?.trim() || '';
  const lastName = resolved.lastName?.trim() || '';
  const firstInitial = firstName.length > 0 ? firstName[0] : '';
  const lastInitial = lastName.length > 0 ? lastName[0] : '';
  const initials = `${firstInitial}${lastInitial}`.trim();

  if (initials.length > 0) {
    return initials.toUpperCase();
  }

  if (resolved.email) {
    return resolved.email[0].toUpperCase();
  }

  return 'U';
});

const menuItems = [
  { label: 'My Tasks', routeName: 'my-tasks' },
  { label: 'Preferences', routeName: 'preferences' },
] as const;

function closeDropdown(): void {
  isOpen.value = false;
}

function toggleDropdown(): void {
  isOpen.value = !isOpen.value;
}

async function loadUserData(): Promise<void> {
  try {
    const response = await axios.get<{ data: CCFUser }>('/api/users/me');
    user.value = response.data.data;
  } catch (error) {
    console.error('Failed to load user profile for V2 shell.', error);
  }
}

async function loadTaskCount(): Promise<void> {
  if (!userStore.isAuthenticated) {
    taskCount.value = 0;
    return;
  }

  try {
    taskCount.value = await getAssignmentCount();
  } catch (error) {
    console.error('Failed to load task count for V2 shell.', error);
    taskCount.value = 0;
  }
}

async function logout(): Promise<void> {
  if (isLoggingOut.value) {
    return;
  }

  isLoggingOut.value = true;
  closeDropdown();

  try {
    await axios.post('/api/auth/logout');
  } catch (error) {
    console.error('Failed to complete server logout.', error);
  } finally {
    userStore.logout();
    isLoggingOut.value = false;
    await router.push({ name: 'login' });
  }
}

function handleClickOutside(event: MouseEvent): void {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown();
  }
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    closeDropdown();
  }
}

onMounted(() => {
  loadUserData();
  loadTaskCount();
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <button
      class="flex items-center gap-2 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] px-3 py-2 text-[var(--ui-v2-foreground)] transition-colors hover:border-[var(--ui-v2-primary)]"
      type="button"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      @click="toggleDropdown"
    >
      <span
        class="relative inline-flex h-8 w-8 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] text-[12px] font-semibold text-[var(--ui-v2-primary)]"
      >
        {{ userInitials }}
        <span
          v-if="taskCount > 0"
          class="absolute -right-2 -top-2 inline-flex min-h-[18px] min-w-[18px] items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] px-1 text-[10px] font-bold text-[var(--ui-v2-background)]"
        >
          {{ taskCount > 9 ? '9+' : taskCount }}
        </span>
      </span>

      <span class="ui-v2-nav hidden text-left sm:block">
        {{ userName }}
      </span>

      <svg
        class="h-4 w-4 transition-transform"
        :class="isOpen ? 'rotate-180' : ''"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M5 7.5L10 12.5L15 7.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="absolute right-0 z-50 mt-2 w-[220px] border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] shadow-lg"
      role="menu"
      aria-label="User Menu"
    >
      <div class="border-b border-[var(--ui-v2-border)] px-3 py-3">
        <p class="ui-v2-nav text-[var(--ui-v2-foreground)]">{{ userName }}</p>
        <p
          class="ui-v2-meta mt-1 break-all text-[var(--ui-v2-tertiary-foreground)]"
        >
          {{ userEmail }}
        </p>
      </div>

      <RouterLink
        v-for="item in menuItems"
        :key="item.routeName"
        :to="{ name: item.routeName }"
        role="menuitem"
        class="ui-v2-nav flex items-center justify-between border-b border-[var(--ui-v2-border)] px-3 py-2 text-[var(--ui-v2-foreground)] transition-colors hover:bg-[var(--ui-v2-primary-tint-10)]"
        @click="closeDropdown"
      >
        <span>{{ item.label }}</span>
        <span
          v-if="item.routeName === 'my-tasks' && taskCount > 0"
          class="inline-flex min-h-[18px] min-w-[18px] items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] px-1 text-[10px] font-bold text-[var(--ui-v2-background)]"
        >
          {{ taskCount > 9 ? '9+' : taskCount }}
        </span>
      </RouterLink>

      <button
        type="button"
        role="menuitem"
        class="ui-v2-nav w-full px-3 py-2 text-left text-[var(--ui-v2-error)] transition-colors hover:bg-[var(--ui-v2-error-tint-10)]"
        :disabled="isLoggingOut"
        @click="logout"
      >
        {{ isLoggingOut ? 'Signing out...' : 'Logout' }}
      </button>
    </div>
  </div>
</template>
