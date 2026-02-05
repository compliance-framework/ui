<template>
  <div class="relative" ref="dropdownRef">
    <!-- Profile Button -->
    <button
      @click="toggleDropdown"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      aria-controls="profile-menu"
      id="profile-dropdown-button"
      class="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 relative"
    >
      <!-- User Avatar (placeholder for now) -->
      <div
        class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold"
      >
        {{ userInitials }}
      </div>

      <!-- Task Count Badge -->
      <span
        v-if="taskCount > 0"
        class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
      >
        {{ taskCount > 9 ? '9+' : taskCount }}
      </span>

      <!-- Dropdown Arrow -->
      <svg
        class="w-4 h-4 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="isOpen"
      id="profile-menu"
      role="menu"
      aria-labelledby="profile-dropdown-button"
      class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50"
    >
      <div class="py-1">
        <!-- User Info -->
        <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ userName }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ userEmail }}
          </p>
        </div>

        <!-- Menu Items -->
        <router-link
          to="/my-tasks"
          role="menuitem"
          tabindex="-1"
          class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
          @click="closeDropdown"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <span>My Tasks</span>
            </div>
            <span
              v-if="taskCount > 0"
              class="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center"
            >
              {{ taskCount > 9 ? '9+' : taskCount }}
            </span>
          </div>
        </router-link>

        <router-link
          to="/preferences"
          role="menuitem"
          tabindex="-1"
          class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
          @click="closeDropdown"
        >
          <div class="flex items-center space-x-2">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>Preferences</span>
          </div>
        </router-link>

        <button
          @click="handleLogout"
          role="menuitem"
          tabindex="-1"
          class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
        >
          <div class="flex items-center space-x-2">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Logout</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/auth';
import { useAuthenticatedInstance } from '@/composables/axios';
import { useMyAssignments } from '@/composables/workflows/useMyAssignments';
import type { CCFUser } from '@/stores/types';

const router = useRouter();
const userStore = useUserStore();
const axios = useAuthenticatedInstance();
const { getAssignmentCount } = useMyAssignments();

const isOpen = ref(false);
const dropdownRef = ref<HTMLElement>();
const user = ref<CCFUser | null>(null);
const currentFocusedIndex = ref(-1);
const taskCount = ref(0);

// Computed properties for user info
const userName = computed(() => {
  if (!user.value) return 'Loading...';
  if (user.value.firstName || user.value.lastName) {
    return `${user.value.firstName || ''} ${user.value.lastName || ''}`.trim();
  }
  return 'Unknown User';
});

const userEmail = computed(() => {
  return user.value?.email || '';
});

const userInitials = computed(() => {
  if (!user.value) return 'U';

  const firstName = user.value.firstName ? user.value.firstName.trim() : '';
  const lastName = user.value.lastName ? user.value.lastName.trim() : '';

  const firstInitial = firstName.length > 0 ? firstName[0] : '';
  const lastInitial = lastName.length > 0 ? lastName[0] : '';

  const initials = `${firstInitial}${lastInitial}`.trim();

  return initials ? initials.toUpperCase() : 'U';
});

// Load user data
const loadUserData = async () => {
  try {
    const response = await axios.get<{ data: CCFUser }>('/api/users/me');
    user.value = response.data.data;
  } catch (error) {
    console.error('Error loading user data:', error);
    user.value = null;
  }
};

// Load task count
const loadTaskCount = async () => {
  if (!userStore.isAuthenticated) {
    return;
  }
  try {
    taskCount.value = await getAssignmentCount();
  } catch (error) {
    console.error('Error loading task count:', error);
    taskCount.value = 0;
  }
};

// Toggle dropdown
const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    currentFocusedIndex.value = -1;
  }
};

// Close dropdown
const closeDropdown = () => {
  isOpen.value = false;
  currentFocusedIndex.value = -1;
};

// Handle logout
const handleLogout = async () => {
  stopTaskPolling();
  try {
    await axios.post('/api/auth/logout');
    userStore.logout();
    router.push({ name: 'login' });
  } catch (error) {
    console.error('Error during logout:', error);
    // Still logout locally even if API call fails
    userStore.logout();
    router.push({ name: 'login' });
  }
};

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown();
  }
};

// Handle keyboard events
const handleKeyDown = (event: KeyboardEvent) => {
  // Only handle keyboard events when the dropdown button or menu is focused
  const dropdownButton = document.getElementById('profile-dropdown-button');
  const dropdownMenu = document.getElementById('profile-menu');
  const activeElement = document.activeElement;

  const isDropdownFocused =
    activeElement === dropdownButton ||
    (dropdownMenu && dropdownMenu.contains(activeElement));

  if (!isDropdownFocused) {
    return;
  }

  if (!isOpen.value) {
    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key === 'ArrowDown'
    ) {
      event.preventDefault();
      toggleDropdown();
      currentFocusedIndex.value = 0;
    }
    return;
  }

  switch (event.key) {
    case 'Escape':
      closeDropdown();
      break;
    case 'ArrowDown':
      event.preventDefault();
      currentFocusedIndex.value = (currentFocusedIndex.value + 1) % 3; // 3 menu items
      focusMenuItem(currentFocusedIndex.value);
      break;
    case 'ArrowUp':
      event.preventDefault();
      currentFocusedIndex.value =
        currentFocusedIndex.value === 0 ? 2 : currentFocusedIndex.value - 1;
      focusMenuItem(currentFocusedIndex.value);
      break;
    case 'Enter':
    case ' ':
      event.preventDefault();
      activateMenuItem(currentFocusedIndex.value);
      break;
  }
};

const focusMenuItem = (index: number) => {
  const menuItems = dropdownRef.value?.querySelectorAll('[role="menuitem"]');
  if (menuItems && menuItems[index]) {
    (menuItems[index] as HTMLElement).focus();
  }
};

const activateMenuItem = (index: number) => {
  const menuItems = dropdownRef.value?.querySelectorAll('[role="menuitem"]');
  if (menuItems && menuItems[index]) {
    (menuItems[index] as HTMLElement).click();
  }
};

const POLLING_INTERVAL = 60000;
let intervalId: ReturnType<typeof setInterval> | null = null;
let isPolling = false;

const startTaskPolling = () => {
  if (isPolling || document.visibilityState === 'hidden') {
    return;
  }
  isPolling = true;
  intervalId = setInterval(loadTaskCount, POLLING_INTERVAL);
};

const stopTaskPolling = () => {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isPolling = false;
};

const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    stopTaskPolling();
  } else {
    // Immediately refresh once when tab becomes visible, then resume polling
    loadTaskCount();
    startTaskPolling();
  }
};

onMounted(() => {
  loadUserData();
  loadTaskCount();
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Refresh task count every 60 seconds while the page is visible
  startTaskPolling();
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  stopTaskPolling();
});
</script>
