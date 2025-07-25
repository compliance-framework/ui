<script setup lang="ts">
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Menu from '@/volt/Menu.vue';
import { BIconThreeDotsVertical } from 'bootstrap-icons-vue';
import { ref } from 'vue';
import type { MenuItem } from 'primevue/menuitem';

const menu = ref();

defineProps<{
  items: MenuItem[];
}>();
</script>

<template>
  <SecondaryButton
    type="button"
    class="dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 hover:dark:border-slate-600"
    @click="menu.toggle($event)"
    aria-haspopup="true"
    aria-controls="overlay_menu"
  >
    <BIconThreeDotsVertical />
  </SecondaryButton>
  <Menu ref="menu" id="overlay_menu" :model="items" :popup="true" />
</template>
