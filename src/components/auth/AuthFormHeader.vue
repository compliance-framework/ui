<template>
  <div class="px-8 pb-8">
    <SideNavLogo alt="Vue logo" :src="lightLogo" class="w-full dark:hidden" />
    <SideNavLogo
      alt="Continuous Compliance Framework"
      :src="darkLogo"
      class="w-full hidden dark:block"
    />
  </div>

  <div class="px-8 mb-6 text-center">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
      {{ title }}
    </h2>
    <p v-if="subtitle" class="text-sm text-gray-600 dark:text-gray-400">
      {{ subtitle }}
    </p>
    <slot />
  </div>
</template>

<script setup lang="ts">
import SideNavLogo from '@/components/navigation/SideNavLogo.vue';
import lightLogo from '@/assets/logo-light.svg';
import darkLogo from '@/assets/logo-dark.svg';

interface Props {
  title: string;
  subtitle?: string;
}

defineProps<Props>();
</script>
