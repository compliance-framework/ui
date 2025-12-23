<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from '@/composables/useTheme';

const { theme, toggleTheme, useSystemValue } = useTheme();

const iconPath = computed(() => {
  if (theme.value === 'dark') {
    // Font Awesome style sun icon
    return 'M256 152c-57.34 0-104 46.66-104 104s46.66 104 104 104s104-46.66 104-104s-46.66-104-104-104m0-88c13.25 0 24-10.75 24-24V24c0-13.25-10.75-24-24-24s-24 10.75-24 24v16c0 13.25 10.75 24 24 24m0 368c-13.25 0-24 10.75-24 24v16c0 13.25 10.75 24 24 24s24-10.75 24-24v-16c0-13.25-10.75-24-24-24m200-200h-16c-13.25 0-24 10.75-24 24s10.75 24 24 24h16c13.25 0 24-10.75 24-24s-10.75-24-24-24m-368 24c0-13.25-10.75-24-24-24H48c-13.25 0-24 10.75-24 24s10.75 24 24 24h16c13.25 0 24-10.75 24-24m282.5-141.1l11.3-11.3c9.37-9.37 9.37-24.57 0-33.94s-24.57-9.37-33.94 0l-11.3 11.3c-9.37 9.37-9.37 24.57 0 33.94s24.57 9.37 33.94 0m-226.5 226.5l-11.3 11.3c-9.37 9.37-9.37 24.57 0 33.94s24.57 9.37 33.94 0l11.3-11.3c9.37-9.38 9.37-24.58 0-33.95s-24.57-9.37-33.94.01m0-226.5c9.37-9.37 9.37-24.57 0-33.94l-11.3-11.3c-9.37-9.37-24.57-9.37-33.94 0s-9.37 24.57 0 33.94l11.3 11.3c9.37 9.37 24.57 9.37 33.94 0m226.5 226.5c-9.37 9.37-9.37 24.57 0 33.94l11.3 11.3c9.37 9.37 24.57 9.37 33.94 0s9.37-24.57 0-33.94l-11.3-11.3c-9.37-9.38-24.57-9.38-33.94 0';
  }
  // Font Awesome style moon icon
  return 'M279.135 512c78.962 0 151.253-35.925 199.061-92.792c7.079-8.327-.639-20.748-11.367-18.223C291.054 443.25 184.313 326.844 184.313 192c0-77.649 38.621-146.196 97.221-187.374c9.206-6.4 5.382-20.713-5.68-22.493C271.798 .579 267.891 0 263.903 0C118.134 0 0 114.639 0 256s118.134 256 263.903 256c5.09 0 10.142-.174 15.232-.51';
});

const handleClick = () => {
  toggleTheme();
};

const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault();
  useSystemValue();
};
</script>

<template>
  <button
    class="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-lg border border-gray-200 dark:border-slate-700 flex items-center justify-center hover:scale-105 transition-transform"
    @click="handleClick"
    @contextmenu="handleContextMenu"
    type="button"
    aria-label="Toggle theme"
    title="Left click toggles theme. Right click matches system preference."
  >
    <svg
      class="h-6 w-6 text-gray-700 dark:text-amber-300 transition-colors"
      viewBox="0 0 512 512"
      fill="currentColor"
      aria-hidden="true"
    >
      <path :d="iconPath" />
    </svg>
  </button>
</template>
