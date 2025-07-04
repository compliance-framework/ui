import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'

export const useSidebarStore = defineStore('sidebar', () => {
  // Get initial state from localStorage or default to false
  const isCollapsed = ref(JSON.parse(localStorage.getItem('sidebar-collapsed') || 'false'))

  function toggleSidebar() {
    isCollapsed.value = !isCollapsed.value
    // Persist to localStorage
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed.value))
  }

  function setCollapsed(collapsed: boolean) {
    isCollapsed.value = collapsed
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed.value))
  }

  return {
    isCollapsed: readonly(isCollapsed),
    toggleSidebar,
    setCollapsed
  }
}) 