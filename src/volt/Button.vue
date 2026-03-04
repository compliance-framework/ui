<template>
  <Button
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template v-for="(_, slotName) in $slots" v-slot:[slotName]="slotProps">
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
        bg-primary enabled:hover:bg-primary-emphasis enabled:active:bg-primary-emphasis-alt text-primary-contrast
        border border-primary enabled:hover:border-primary-emphasis enabled:active:border-primary-emphasis-alt
        focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-primary
        p-vertical:flex-col p-fluid:w-full p-fluid:p-icon-only:w-10
        p-icon-only:w-10 p-icon-only:px-0 p-icon-only:gap-0
        p-icon-only:p-rounded:rounded-full p-icon-only:p-rounded:h-10
        p-small:text-sm p-small:px-[0.625rem] p-small:py-[0.375rem]
        p-large:text-[1.125rem] p-large:px-[0.875rem] p-large:py-[0.625rem]
        p-raised:shadow-sm p-rounded:rounded-[2rem]
        p-outlined:bg-transparent enabled:hover:p-outlined:bg-primary-50 enabled:active:p-outlined:bg-primary-100
        p-outlined:border-primary-200 enabled:hover:p-outlined:border-primary-200 enabled:active:p-outlined:border-primary-200
        p-outlined:text-primary enabled:hover:p-outlined:text-primary enabled:active:p-outlined:text-primary
        dark:p-outlined:bg-transparent dark:enabled:hover:p-outlined:bg-primary/5 dark:enabled:active:p-outlined:bg-primary/15
        dark:p-outlined:border-primary-700 dark:enabled:hover:p-outlined:border-primary-700 dark:enabled:active:p-outlined:border-primary-700
        dark:p-outlined:text-primary dark:enabled:hover:p-outlined:text-primary dark:enabled:active:p-outlined:text-primary
        p-text:bg-transparent enabled:hover:p-text:bg-primary-50 enabled:active:p-text:bg-primary-100
        p-text:border-transparent enabled:hover:p-text:border-transparent enabled:active:p-text:border-transparent
        p-text:text-primary enabled:hover:p-text:text-primary enabled:active:p-text:text-primary
        dark:p-text:bg-transparent dark:enabled:hover:p-text:bg-primary/5 dark:enabled:active:p-text:bg-primary/15
        dark:p-text:border-transparent dark:enabled:hover:p-text:border-transparent dark:enabled:active:p-text:border-transparent
        dark:p-text:text-primary dark:enabled:hover:p-text:text-primary dark:enabled:active:p-text:text-primary
    `,
  loadingIcon: `animate-spin`,
  icon: `p-right:order-1 p-bottom:order-2`,
  label: `font-medium p-icon-only:invisible p-icon-only:w-0
        p-small:text-sm p-large:text-[1.125rem]`,
  pcBadge: {
    root: `min-w-4 h-4 leading-4 bg-primary-contrast rounded-full text-primary text-xs font-bold`,
  },
};

const v2Theme: ButtonPassThroughOptions = {
  root: `inline-flex cursor-pointer select-none items-center justify-center overflow-hidden relative
        h-11 px-[18px] py-[10px] gap-2 rounded-none
        border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary)] text-[var(--ui-v2-primary-foreground)]
        font-[var(--ui-v2-font-secondary)] text-[12px] font-bold tracking-[1px] uppercase leading-none
        disabled:pointer-events-none disabled:opacity-60 transition-colors duration-150
        enabled:hover:border-[var(--ui-v2-primary)] enabled:hover:bg-[var(--ui-v2-primary)] enabled:hover:text-[var(--ui-v2-primary-foreground)]
        enabled:active:border-[var(--ui-v2-primary)] enabled:active:bg-[var(--ui-v2-primary)] enabled:active:text-[var(--ui-v2-primary-foreground)]
        focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-v2-primary)]
        p-fluid:w-full p-fluid:p-icon-only:w-10 p-vertical:flex-col
        p-icon-only:w-10 p-icon-only:px-0 p-icon-only:gap-0 p-icon-only:p-rounded:h-10
        p-small:h-7 p-small:text-[10px] p-small:px-[10px] p-small:py-[6px]
        p-large:h-11 p-large:text-[12px] p-large:px-[18px] p-large:py-[10px]
        p-raised:shadow-none p-rounded:rounded-none
        p-outlined:bg-[var(--ui-v2-surface)] p-outlined:border-[var(--ui-v2-border)] p-outlined:text-[var(--ui-v2-foreground)]
        enabled:hover:p-outlined:border-[var(--ui-v2-border)] enabled:hover:p-outlined:bg-[var(--ui-v2-surface)] enabled:hover:p-outlined:text-[var(--ui-v2-foreground)]
        p-text:bg-transparent p-text:border-transparent p-text:text-[var(--ui-v2-muted-foreground)]
        enabled:hover:p-text:bg-transparent enabled:hover:p-text:text-[var(--ui-v2-muted-foreground)]
        p-secondary:border-[var(--ui-v2-border)] p-secondary:bg-[var(--ui-v2-surface)] p-secondary:text-[var(--ui-v2-foreground)]
        enabled:hover:p-secondary:border-[var(--ui-v2-border)] enabled:hover:p-secondary:bg-[var(--ui-v2-surface)] enabled:hover:p-secondary:text-[var(--ui-v2-foreground)]
        p-danger:border-[var(--ui-v2-error)] p-danger:bg-[var(--ui-v2-error)] p-danger:text-[var(--ui-v2-error-foreground)]
        enabled:hover:p-danger:border-[var(--ui-v2-error)] enabled:hover:p-danger:bg-[var(--ui-v2-error)] enabled:hover:p-danger:text-[var(--ui-v2-error-foreground)]
        p-contrast:border-[var(--ui-v2-foreground)] p-contrast:bg-[var(--ui-v2-foreground)] p-contrast:text-[var(--ui-v2-background)]
        enabled:hover:p-contrast:bg-[var(--ui-v2-secondary-foreground)]`,
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
