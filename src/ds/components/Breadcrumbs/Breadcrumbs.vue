<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import Icon from '../Icon/Icon.vue';

/**
 * Where am I and how do I get back (F-10 AC6): the page's ancestors, e.g. Systems › Enterprise
 * Logging › Risks, each a link. The page itself is not a crumb, because its h1 already names it.
 */
withDefaults(
  defineProps<{
    crumbs: { label: string; to: RouteLocationRaw }[];
    label?: string;
  }>(),
  {
    label: 'Breadcrumb',
  },
);
</script>

<template>
  <nav :aria-label="label" class="breadcrumbs">
    <ol class="breadcrumbs__list">
      <li
        v-for="(crumb, index) in crumbs"
        :key="index"
        class="breadcrumbs__item"
      >
        <Icon
          v-if="index > 0"
          name="next"
          size="sm"
          class="breadcrumbs__separator"
        />
        <RouterLink :to="crumb.to" class="breadcrumbs__link">{{
          crumb.label
        }}</RouterLink>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumbs__list {
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1) var(--space-2);
  font-size: var(--font-size-caption);
  line-height: var(--leading-snug);
  color: var(--color-text-secondary);
}

.breadcrumbs__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  overflow-wrap: anywhere;
}

.breadcrumbs__link {
  display: inline-flex;
  align-items: center;
  min-height: var(--size-target-min);
  color: var(--color-text-primary);
  text-decoration: underline;
  text-underline-offset: var(--space-1);
}

.breadcrumbs__link:hover {
  color: var(--color-text-accent);
}
</style>
