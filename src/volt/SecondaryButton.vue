<template>
  <Button
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </Button>
</template>

<script setup lang="ts">
import Button, {
  type ButtonPassThroughOptions,
  type ButtonProps,
} from 'primevue/button';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ ButtonProps {}
defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: ButtonPassThroughOptions = {
  root: `inline-flex cursor-pointer select-none items-center justify-center overflow-hidden relative
        px-3 py-2 gap-2 rounded-md disabled:pointer-events-none disabled:opacity-60 transition-colors duration-200
        bg-surface-100 enabled:hover:bg-surface-200 enabled:active:bg-surface-300
        border border-surface-100 enabled:hover:border-surface-200 enabled:active:border-surface-300
        text-surface-600 enabled:hover:text-surface-700 enabled:active:text-surface-800
        dark:bg-surface-800 dark:enabled:hover:bg-surface-700 dark:enabled:active:bg-surface-600
        dark:border-surface-800 dark:enabled:hover:border-surface-700 dark:enabled:active:border-surface-600
        dark:text-surface-300 dark:enabled:hover:text-surface-200 dark:enabled:active:text-surface-100
        focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2
        focus-visible:outline-surface-600 dark:focus-visible:outline-surface-300
        p-vertical:flex-col p-fluid:w-full p-fluid:p-icon-only:w-10
        p-icon-only:w-10 p-icon-only:px-0 p-icon-only:gap-0
        p-icon-only:p-rounded:rounded-full p-icon-only:p-rounded:h-10
        p-small:text-sm p-small:px-[0.625rem] p-small:py-[0.375rem]
        p-large:text-[1.125rem] p-large:px-[0.875rem] p-large:py-[0.625rem]
        p-raised:shadow-sm p-rounded:rounded-[2rem]
        p-outlined:bg-transparent enabled:hover:p-outlined:bg-surface-50 enabled:active:p-outlined:bg-surface-100
        p-outlined:border-surface-200 enabled:hover:p-outlined:border-surface-200 enabled:active:p-outlined:border-surface-200
        p-outlined:text-surface-500 enabled:hover:p-outlined:text-surface-500 enabled:active:p-outlined:text-surface-500
        dark:p-outlined:bg-transparent dark:enabled:hover:p-outlined:bg-white/5 dark:enabled:active:p-outlined:bg-white/15
        dark:p-outlined:border-surface-700 dark:enabled:hover:p-outlined:border-surface-700 dark:enabled:active:p-outlined:border-surface-700
        dark:p-outlined:text-surface-400 dark:enabled:hover:p-outlined:text-surface-400 dark:enabled:active:p-outlined:text-surface-400
        p-text:bg-transparent enabled:hover:p-text:bg-surface-50 enabled:active:p-text:bg-surface-100
        p-text:border-transparent enabled:hover:p-text:border-transparent enabled:active:p-text:border-transparent
        p-text:text-surface-500 enabled:hover:p-text:text-surface-500 enabled:active:p-text:text-surface-500
        dark:p-text:bg-transparent dark:enabled:hover:p-text:bg-surface-800 dark:enabled:active:p-text:bg-surface-700
        dark:p-text:border-transparent dark:enabled:hover:p-text:border-transparent dark:enabled:active:p-text:border-transparent
        dark:p-text:text-surface-400 dark:enabled:hover:p-text:text-surface-400 dark:enabled:active:p-text:text-surface-400
    `,
  loadingIcon: ``,
  icon: `p-right:order-1 p-bottom:order-2`,
  label: `font-medium p-icon-only:invisible p-icon-only:w-0
        p-small:text-sm p-large:text-[1.125rem]`,
  pcBadge: {
    root: `min-w-4 h-4 leading-4`,
  },
};

const v2Theme: ButtonPassThroughOptions = {
  root: `inline-flex cursor-pointer select-none items-center justify-center overflow-hidden relative
        h-11 px-[18px] py-[10px] gap-2 rounded-none
        border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] text-[var(--ui-v2-foreground)]
        font-[var(--ui-v2-font-secondary)] text-[12px] font-bold tracking-[1px] uppercase leading-none
        disabled:pointer-events-none disabled:opacity-60 transition-colors duration-150
        enabled:hover:border-[var(--ui-v2-border)] enabled:hover:bg-[var(--ui-v2-surface)] enabled:hover:text-[var(--ui-v2-foreground)]
        enabled:active:border-[var(--ui-v2-border)] enabled:active:bg-[var(--ui-v2-surface)] enabled:active:text-[var(--ui-v2-foreground)]
        focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-v2-primary)]
        p-fluid:w-full p-fluid:p-icon-only:w-10 p-vertical:flex-col
        p-icon-only:w-10 p-icon-only:px-0 p-icon-only:gap-0 p-icon-only:p-rounded:h-10
        p-small:h-7 p-small:text-[10px] p-small:px-[10px] p-small:py-[6px]
        p-large:h-11 p-large:text-[12px] p-large:px-[18px] p-large:py-[10px]
        p-rounded:rounded-none p-outlined:bg-[var(--ui-v2-surface)]
        p-text:h-7 p-text:px-[10px] p-text:py-[6px] p-text:bg-transparent p-text:border-transparent p-text:text-[var(--ui-v2-muted-foreground)]`,
  loadingIcon: 'animate-spin',
  icon: 'p-right:order-1 p-bottom:order-2',
  label: `font-bold tracking-[1px] uppercase p-icon-only:invisible p-icon-only:w-0
        p-small:text-[10px] p-large:text-[12px]`,
  pcBadge: {
    root: `min-w-4 h-4 leading-4 rounded-none text-[10px] font-bold
          bg-[var(--ui-v2-background)] text-[var(--ui-v2-foreground)]`,
  },
};

const theme = computed<ButtonPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
