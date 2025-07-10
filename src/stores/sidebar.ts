import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'

export const useSidebarStore = defineStore('sidebar', () => {
  // Initialize with default value
  const isCollapsed = ref(false)

  // Get initial state from localStorage or default to false
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      isCollapsed.value = JSON.parse(localStorage.getItem('sidebar-collapsed') || 'false')
    } catch (error) {
      console.error('Failed to read from localStorage:', error)
    }
  }

  function toggleSidebar() {
    isCollapsed.value = !isCollapsed.value
    // Persist to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed.value))
      } catch (error) {
        console.error('Failed to write to localStorage:', error)
      }
    }
  }

  function setCollapsed(collapsed: boolean) {
    isCollapsed.value = collapsed
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed.value))
      } catch (error) {
        console.error('Failed to write to localStorage:', error)
      }
    }
  }

  return {
    isCollapsed: readonly(isCollapsed),
    toggleSidebar,
    setCollapsed
  }
})