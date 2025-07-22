import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export const useSidebarStore = defineStore('sidebar', () => {
  // Initialize with default value
  const open = useLocalStorage('sidebarOpen', true)

  function toggle() {
    open.value = !open.value
  }

  return {
    open,
    toggle,
  }
})
