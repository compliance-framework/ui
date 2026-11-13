<script setup lang="ts">
/**
 * The one two-column page body: a wide main column beside a narrower side column (2:1), each a
 * stack of panels. It responds to the width of the content area (breakpoint `columns`, a container
 * query), not the window, so it adapts whether the nav is expanded, a rail or a drawer. Below that
 * width the side column follows the main.
 */
</script>

<template>
  <div class="split" :class="{ 'split--with-side': $slots.side }">
    <div class="split__main"><slot /></div>
    <div v-if="$slots.side" class="split__side"><slot name="side" /></div>
  </div>
</template>

<style scoped>
.split {
  display: grid;
  gap: var(--ds-space-5);
  min-width: 0;
}

.split__main,
.split__side {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-5);
  min-width: 0;
}

@container (min-width: 960px) {
  .split--with-side {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    align-items: start;
  }
}
</style>
