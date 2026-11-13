<script setup lang="ts">
/**
 * The one page header (F-10 AC5, F-30 AC1, P9): the page's single h1 (the record title, in its
 * source case – D-11), status, description and key facts, with the region's one
 * primary action and overflow on the right. Actions wrap below the title on narrow screens.
 * `compact` is for tool pages whose panes fill the screen (the Workspace template): a smaller
 * title with the description beside it, so the header takes one line.
 * There is no type eyebrow: the breadcrumb already says where the page sits (DEC-38). A
 * description says what the page can't show by itself, never its title again in other words.
 */
withDefaults(
  defineProps<{ title: string; description?: string; compact?: boolean }>(),
  {
    description: undefined,
    compact: false,
  },
);
</script>

<template>
  <header class="page-header" :class="{ 'page-header--compact': compact }">
    <div class="page-header__main">
      <div class="page-header__title-row">
        <h1 class="page-header__title">{{ title }}</h1>
        <div v-if="$slots.status" class="page-header__status">
          <slot name="status" />
        </div>
        <p v-if="description && compact" class="page-header__description">
          {{ description }}
        </p>
      </div>
      <p v-if="description && !compact" class="page-header__description">
        {{ description }}
      </p>
      <div v-if="$slots.facts" class="page-header__facts">
        <slot name="facts" />
      </div>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4) var(--space-6);
}

.page-header__main {
  display: flex;
  flex: 1 1 var(--width-column-lg);
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.page-header__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}

.page-header__title {
  min-width: 0;
  font-family: var(--font-display);
  font-size: var(--font-size-h1);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-tight);
  overflow-wrap: anywhere;
}

.page-header--compact .page-header__main {
  gap: var(--space-1);
}

.page-header--compact .page-header__title-row {
  align-items: baseline;
  gap: var(--space-1) var(--space-4);
}

.page-header--compact .page-header__title {
  font-size: var(--font-size-h1-compact);
}

.page-header__description {
  max-width: var(--width-reading);
  color: var(--color-text-secondary);
  font-family: var(--font-prose);
  font-size: var(--font-size-prose);
  line-height: var(--leading-prose);
}

.page-header__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}
</style>
