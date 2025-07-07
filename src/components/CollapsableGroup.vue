<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
  open: Boolean,
})

const isOpen = ref<boolean>(props.open);
function toggleOpen() {
  isOpen.value = !isOpen.value;
}
</script>

<template>
    <div @click="toggleOpen" :class='{
      "cursor-pointer hover:bg-zinc-50 dark:hover:bg-slate-800 border-b border-ccf-300 dark:border-slate-800": true,
      "hover:bg-gray-100": !isOpen,
      // "bg-blue-800": isOpen,
    }'>
      <slot name="header" :is-open="isOpen"></slot>
    </div>
    <div v-if="isOpen">
      <slot></slot>
    </div>
</template>
