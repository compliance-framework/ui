<script setup lang="ts">
// The frame for classic pages not yet migrated to the design system. The app shell's element
// defaults use the design system's font and colours; this restores what the classic layout gave
// its pages (Inter, its text colours, ligatures), so they look as they did until replaced.
</script>

<template>
  <div class="legacy-page font-sans text-zinc-800 dark:text-slate-50">
    <slot />
  </div>
</template>

<style scoped>
.legacy-page {
  font-variant-ligatures: normal;
}
</style>
