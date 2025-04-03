<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)

function toggleOpen() {
  isOpen.value = !isOpen.value;
}
</script>

<template>
  <div class="my-1">
    <div @click="toggleOpen" :class='{
      "cursor-pointer border border-zinc-300 border-collapse": true,
      "hover:bg-gray-100": !isOpen,
      // "bg-blue-800": isOpen,
    }'>
      <slot name="header"></slot>
    </div>
    <div v-if="isOpen" :class='{
      "bg-gray-50 px-4 border-2": isOpen
    }'>
      <slot></slot>
    </div>
  </div>
</template>
