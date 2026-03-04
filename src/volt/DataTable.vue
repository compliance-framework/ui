<template>
  <DataTable
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
  </DataTable>
</template>

<script setup lang="ts">
import DataTable, {
  type DataTablePassThroughOptions,
  type DataTableProps,
} from 'primevue/datatable';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ DataTableProps {}
defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: DataTablePassThroughOptions = {
  root: 'border border-surface-200 dark:border-surface-700 rounded-md bg-white dark:bg-slate-900',
  tableContainer: 'overflow-auto',
  table: 'w-full border-separate border-spacing-0',
  thead:
    'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-100',
  headerRow: 'text-left',
  tbody: 'text-surface-700 dark:text-surface-0',
  bodyRow:
    'border-b border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors duration-150',
  emptyMessage: 'text-center text-surface-500 dark:text-surface-400',
  emptyMessageCell: 'px-4 py-6',
  footer: 'border-t border-surface-200 dark:border-surface-700',
  pcPaginator: {
    root: 'border-t border-surface-200 dark:border-surface-700',
  },
};

const v2Theme: DataTablePassThroughOptions = {
  root: 'border border-[var(--ui-v2-border)] rounded-none bg-[var(--ui-v2-card)]',
  tableContainer: 'overflow-auto',
  table: 'w-full border-separate border-spacing-0',
  thead:
    'bg-[var(--ui-v2-surface)] text-[var(--ui-v2-secondary-foreground)] ui-v2-nav border-b border-[var(--ui-v2-border)]',
  headerRow: 'text-left',
  tbody: 'text-[var(--ui-v2-foreground)]',
  bodyRow:
    'border-b border-[var(--ui-v2-border)] hover:bg-[var(--ui-v2-surface)] transition-colors duration-150',
  emptyMessage: 'text-center ui-v2-meta text-[var(--ui-v2-muted-foreground)]',
  emptyMessageCell: 'px-4 py-6',
  footer: 'border-t border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)]',
  pcPaginator: {
    root: 'border-t border-[var(--ui-v2-border)]',
  },
};

const theme = computed<DataTablePassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
