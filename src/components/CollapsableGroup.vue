<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({
  open: Boolean,
});

const isOpen = ref<boolean>(props.open);
function toggleOpen() {
  isOpen.value = !isOpen.value;
}
</script>

<template>
  <div class="border-b border-ccf-300 dark:border-slate-800">
    <div
      @click="toggleOpen"
      :class="{
        'cursor-pointer hover:bg-zinc-50 dark:hover:bg-slate-800': true,
      }"
    >
      <slot name="header" :is-open="isOpen"></slot>
    </div>
    <div v-if="isOpen" class="bg-white dark:bg-slate-900">
      <slot></slot>
    </div>
  </div>
</template>
