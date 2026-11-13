<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router';

/** An inline link in running text. Underlined, so it never relies on colour alone (1.4.1). */
defineProps<
  { to: RouteLocationRaw; href?: never } | { href: string; to?: never }
>();
</script>

<template>
  <a v-if="href" :href="href" class="text-link"><slot /></a>
  <RouterLink v-else :to="to!" class="text-link"><slot /></RouterLink>
</template>

<style scoped>
.text-link {
  overflow-wrap: anywhere;
  color: var(--ds-color-text-primary);
  font-weight: var(--ds-font-weight-semibold);
  text-decoration: underline;
  text-decoration-thickness: var(--ds-border-width);
  text-underline-offset: var(--ds-space-1);
}

.text-link:hover {
  color: var(--ds-color-text-accent);
  text-decoration-thickness: var(--ds-focus-width);
}
</style>
