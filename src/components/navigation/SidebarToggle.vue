<template>
  <button
    @click="sidebarStore.toggleSidebar()"
    class="absolute -right-3 top-8 z-50 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center group"
    title="Toggle Sidebar"
  >
    <svg 
      class="w-3 h-3 text-gray-600 dark:text-slate-300 transition-transform duration-300"
      :class="{
        'rotate-180': sidebarStore.isCollapsed,
        'rotate-0': !sidebarStore.isCollapsed
      }"
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { useSidebarStore } from '@/stores/sidebar'

const sidebarStore = useSidebarStore()
</script> 