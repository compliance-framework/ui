<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)

function toggleOpen() {
  isOpen.value = !isOpen.value;
}
</script>

<template>
    <div @click="toggleOpen" :class='{
      "cursor-pointer hover:bg-zinc-50 dark:hover:bg-slate-800 border-b dark:border-slate-800": true,
      "hover:bg-gray-100": !isOpen,
      // "bg-blue-800": isOpen,
    }'>
      <slot name="header"></slot>
    </div>
    <div v-if="isOpen" :class='{}'>
      <slot></slot>
    </div>
</template>
