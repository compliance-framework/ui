<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import Icon from '../Icon/Icon.vue';
import { pageItems } from './pages';

/**
 * Page links for a list whose page lives in the URL (04 §3 rule 3), so Back, Forward and shared
 * links keep the page. Real links, the current page marked with aria-current; the first and last
 * page, the pages beside the current one, and an ellipsis for the rest. Previous and Next at the
 * ends are plain text with the reason, never dead links. Targets meet the 24 pixel minimum; the row wraps
 * on 320 pixel screens. `totalLabel` says what is shown, e.g. "Showing 21–40 of 62".
 */
const props = withDefaults(
  defineProps<{
    page: number;
    pageCount: number;
    to: (page: number) => RouteLocationRaw;
    totalLabel?: string;
    /** Landmark name; give each pagination on a page its own. */
    label?: string;
  }>(),
  { totalLabel: undefined, label: 'Pagination' },
);

const items = computed(() => pageItems(props.page, props.pageCount));
</script>

<template>
  <nav class="pagination" :aria-label="label">
    <p v-if="totalLabel" class="pagination__total">{{ totalLabel }}</p>
    <ul v-if="pageCount > 1" class="pagination__list">
      <li>
        <RouterLink
          v-if="page > 1"
          :to="to(page - 1)"
          class="pagination__link"
          rel="prev"
        >
          <Icon name="back" size="sm" />Previous
        </RouterLink>
        <span v-else class="pagination__link pagination__link--disabled">
          <Icon name="back" size="sm" />Previous<span class="visually-hidden"
            >, unavailable on the first page</span
          >
        </span>
      </li>
      <li v-for="item in items" :key="item">
        <span
          v-if="typeof item === 'string'"
          class="pagination__gap"
          aria-hidden="true"
          >…</span
        >
        <RouterLink v-else :to="to(item)" custom>
          <template #default="{ href, navigate }">
            <a
              :href="href"
              class="pagination__link pagination__link--number"
              :class="{ 'pagination__link--current': item === page }"
              :aria-current="item === page ? 'page' : undefined"
              :aria-label="`Page ${item}`"
              @click="navigate"
              >{{ item }}</a
            >
          </template>
        </RouterLink>
      </li>
      <li>
        <RouterLink
          v-if="page < pageCount"
          :to="to(page + 1)"
          class="pagination__link"
          rel="next"
        >
          Next<Icon name="next" size="sm" />
        </RouterLink>
        <span v-else class="pagination__link pagination__link--disabled">
          Next<span class="visually-hidden">, unavailable on the last page</span
          ><Icon name="next" size="sm" />
        </span>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--ds-space-3) var(--ds-space-4);
  min-width: 0;
}

.pagination__total {
  margin: 0;
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-leading-snug);
}

.pagination__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.pagination__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ds-space-1);
  min-width: var(--ds-size-control-sm);
  min-height: var(--ds-size-control-sm);
  padding: 0 var(--ds-space-2);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  background: var(--ds-color-surface-raised);
  color: var(--ds-color-text-primary);
  font-size: var(--ds-font-size-body);
  font-weight: var(--ds-font-weight-medium);
  line-height: var(--ds-leading-snug);
  text-decoration: none;
  transition: background-color var(--ds-duration-fast) var(--ds-ease-standard);
}

a.pagination__link:hover {
  background: var(--ds-color-surface-hover);
}

.pagination__link--current,
a.pagination__link--current:hover {
  background: var(--ds-color-action-primary-bg);
  border-color: var(--ds-color-action-primary-border);
  color: var(--ds-color-action-primary-fg);
  font-weight: var(--ds-font-weight-bold);
}

/* Not a control, so it keeps readable text; the dashed border marks it as unavailable. */
.pagination__link--disabled {
  border-style: dashed;
  background: transparent;
  color: var(--ds-color-text-secondary);
  cursor: not-allowed;
}

.pagination__gap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--ds-size-target-min);
  min-height: var(--ds-size-control-sm);
  color: var(--ds-color-text-secondary);
}
</style>
