<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)

function toggleOpen() {
  isOpen.value = !isOpen.value;
}
</script>

<template>
  <div>
    <div @click="toggleOpen" class="cursor-pointer hover:bg-gray-100">
      <slot name="header"></slot>
    </div>
    <div :class="{ hidden: !isOpen }">
      <slot></slot>
    </div>
  </div>
</template>
