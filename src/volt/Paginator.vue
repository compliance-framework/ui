<template>
  <Paginator
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
    v-bind="$attrs"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </Paginator>
</template>

<script setup lang="ts">
import Paginator, {
  type PaginatorPassThroughOptions,
  type PaginatorProps,
} from 'primevue/paginator';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ PaginatorProps {}
defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: PaginatorPassThroughOptions = {
  root: 'flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-slate-900',
  content: 'flex items-center gap-1',
  first:
    'inline-flex items-center justify-center w-8 h-8 rounded-md border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 disabled:opacity-50',
  prev: 'inline-flex items-center justify-center w-8 h-8 rounded-md border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 disabled:opacity-50',
  next: 'inline-flex items-center justify-center w-8 h-8 rounded-md border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 disabled:opacity-50',
  last: 'inline-flex items-center justify-center w-8 h-8 rounded-md border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 disabled:opacity-50',
  pages: 'flex items-center gap-1',
  page: 'inline-flex items-center justify-center min-w-8 h-8 rounded-md border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 p-active:bg-primary p-active:border-primary p-active:text-primary-contrast',
  current: 'text-xs text-surface-500 dark:text-surface-400',
};

const v2Theme: PaginatorPassThroughOptions = {
  root: 'flex items-center justify-between gap-2 px-3 py-2 bg-[var(--ui-v2-card)]',
  content: 'flex items-center gap-1',
  first:
    'inline-flex items-center justify-center w-8 h-8 rounded-none border border-[var(--ui-v2-border)] text-[var(--ui-v2-secondary-foreground)] disabled:opacity-50 hover:border-[var(--ui-v2-primary)] hover:text-[var(--ui-v2-primary)]',
  prev: 'inline-flex items-center justify-center w-8 h-8 rounded-none border border-[var(--ui-v2-border)] text-[var(--ui-v2-secondary-foreground)] disabled:opacity-50 hover:border-[var(--ui-v2-primary)] hover:text-[var(--ui-v2-primary)]',
  next: 'inline-flex items-center justify-center w-8 h-8 rounded-none border border-[var(--ui-v2-border)] text-[var(--ui-v2-secondary-foreground)] disabled:opacity-50 hover:border-[var(--ui-v2-primary)] hover:text-[var(--ui-v2-primary)]',
  last: 'inline-flex items-center justify-center w-8 h-8 rounded-none border border-[var(--ui-v2-border)] text-[var(--ui-v2-secondary-foreground)] disabled:opacity-50 hover:border-[var(--ui-v2-primary)] hover:text-[var(--ui-v2-primary)]',
  pages: 'flex items-center gap-1',
  page: 'inline-flex items-center justify-center min-w-8 h-8 rounded-none border border-[var(--ui-v2-border)] text-[var(--ui-v2-secondary-foreground)] p-active:bg-[var(--ui-v2-primary)] p-active:border-[var(--ui-v2-primary)] p-active:text-[var(--ui-v2-primary-foreground)] hover:border-[var(--ui-v2-primary)] hover:text-[var(--ui-v2-primary)]',
  current: 'ui-v2-meta text-[var(--ui-v2-muted-foreground)]',
};

const theme = computed<PaginatorPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
