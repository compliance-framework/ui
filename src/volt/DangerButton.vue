<template>
  <Button
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
        bg-red-600 enabled:hover:bg-red-700 enabled:active:bg-red-800 text-white
        border border-red-600 enabled:hover:border-red-700 enabled:active:border-red-800
        focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-red-500
        p-vertical:flex-col p-fluid:w-full p-fluid:p-icon-only:w-10
        p-icon-only:w-10 p-icon-only:px-0 p-icon-only:gap-0
        p-small:text-sm p-small:px-[0.625rem] p-small:py-[0.375rem]
        p-large:text-[1.125rem] p-large:px-[0.875rem] p-large:py-[0.625rem]
        p-rounded:rounded-[2rem]`,
  loadingIcon: 'animate-spin',
  icon: 'p-right:order-1 p-bottom:order-2',
  label: `font-medium p-icon-only:invisible p-icon-only:w-0
        p-small:text-sm p-large:text-[1.125rem]`,
};

const v2Theme: ButtonPassThroughOptions = {
  root: `inline-flex cursor-pointer select-none items-center justify-center overflow-hidden relative
        h-11 px-[18px] py-[10px] gap-2 rounded-none
        border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error)] text-[var(--ui-v2-error-foreground)]
        font-[var(--ui-v2-font-secondary)] text-[12px] font-bold tracking-[1px] uppercase leading-none
        disabled:pointer-events-none disabled:opacity-60 transition-colors duration-150
        enabled:hover:border-[var(--ui-v2-error)] enabled:hover:bg-[var(--ui-v2-error)] enabled:hover:text-[var(--ui-v2-error-foreground)]
        enabled:active:border-[var(--ui-v2-error)] enabled:active:bg-[var(--ui-v2-error)] enabled:active:text-[var(--ui-v2-error-foreground)]
        focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-v2-error)]
        p-vertical:flex-col p-fluid:w-full p-fluid:p-icon-only:w-10
        p-icon-only:w-10 p-icon-only:px-0 p-icon-only:gap-0
        p-small:h-7 p-small:text-[10px] p-small:px-[10px] p-small:py-[6px]
        p-large:h-11 p-large:text-[12px] p-large:px-[18px] p-large:py-[10px]
        p-rounded:rounded-none`,
  loadingIcon: 'animate-spin',
  icon: 'p-right:order-1 p-bottom:order-2',
  label: `font-bold tracking-[1px] uppercase p-icon-only:invisible p-icon-only:w-0
        p-small:text-[10px] p-large:text-[12px]`,
};

const theme = computed<ButtonPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
