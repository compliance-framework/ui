<script setup lang="ts">
import { RouterView } from 'vue-router';

import Toast from '@/volt/Toast.vue';
import { useToast } from 'primevue/usetoast';

const toast = useToast();   // instance to create messages

const show = () => {
  toast.add({ severity: 'info', summary: 'Info', detail: 'Message Content', life: 3000 });
};
</script>

<template>
  <div class="flex">
    <button type="button" @click="show" class="bg-blue-500 px-12 py-12">SHOW ME THE MONEY ! </button>
    <Toast />

    <main
      class="z-10 px-12 py-4 bg-zinc-50 dark:bg-slate-950 text-zinc-800 dark:text-slate-50 w-full h-screen"
    >
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>
  </div>
</template>

<style>
@reference "@/assets/main.css";

body,
html {
  @apply bg-white;
}
</style>
