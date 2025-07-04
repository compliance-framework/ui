<script setup lang="ts">
import { useSidebarStore } from '@/stores/sidebar'

defineProps({
  title: String,
})

const sidebarStore = useSidebarStore()
</script>
<template>
  <div 
    v-if="!sidebarStore.isCollapsed"
    class="text-zinc-500 dark:text-slate-400 py-2 pl-8"
  >
    {{ title }}
  </div>
  <div class="mb-2">
    <slot></slot>
  </div>
</template>
