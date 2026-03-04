<template>
  <Column
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
  </Column>
</template>

<script setup lang="ts">
import Column, {
  type ColumnPassThroughOptions,
  type ColumnProps,
} from 'primevue/column';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ ColumnProps {}
defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: ColumnPassThroughOptions = {
  headerCell:
    'px-4 py-3 border-b border-surface-200 dark:border-surface-700 font-semibold',
  columnHeaderContent: 'flex items-center gap-2',
  columnTitle: 'text-sm',
  sort: 'inline-flex items-center gap-1 text-surface-500 dark:text-surface-400',
  sortIcon: 'text-sm',
  bodyCell:
    'px-4 py-3 border-b border-surface-200 dark:border-surface-700 align-top',
  bodyCellContent: 'text-sm',
  footerCell: 'px-4 py-2 border-t border-surface-200 dark:border-surface-700',
};

const v2Theme: ColumnPassThroughOptions = {
  headerCell:
    'px-4 py-3 border-b border-[var(--ui-v2-border)] font-medium ui-v2-nav text-[var(--ui-v2-secondary-foreground)]',
  columnHeaderContent: 'flex items-center gap-2',
  columnTitle: 'ui-v2-nav',
  sort: 'inline-flex items-center gap-1 text-[var(--ui-v2-secondary-foreground)]',
  sortIcon: 'text-sm',
  bodyCell:
    'px-4 py-3 border-b border-[var(--ui-v2-border)] align-top text-[var(--ui-v2-foreground)]',
  bodyCellContent: 'ui-v2-body',
  footerCell:
    'px-4 py-2 border-t border-[var(--ui-v2-border)] ui-v2-meta text-[var(--ui-v2-muted-foreground)]',
};

const theme = computed<ColumnPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
