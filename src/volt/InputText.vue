<template>
  <InputText
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  />
</template>

<script setup lang="ts">
import InputText, {
  type InputTextPassThroughOptions,
  type InputTextProps,
} from 'primevue/inputtext';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ InputTextProps {}
defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: InputTextPassThroughOptions = {
  root: `appearance-none rounded-md outline-hidden
        bg-surface-0 dark:bg-surface-950
        p-filled:bg-surface-50 dark:p-filled:bg-surface-800
        text-surface-700 dark:text-surface-0
        placeholder:text-surface-500 dark:placeholder:text-surface-400
        border border-surface-300 dark:border-surface-700
        enabled:hover:border-surface-400 dark:enabled:hover:border-surface-600
        enabled:focus:border-primary
        disabled:cursor-not-allowed
        disabled:bg-neutral-100 disabled:text-zinc-400
        dark:disabled:bg-slate-800 dark:disabled:text-slate-400
        p-invalid:border-red-400 dark:p-invalid:border-red-300
        p-invalid:placeholder:text-red-600 dark:p-invalid:placeholder:text-red-400
        px-3 py-2 p-fluid:w-full
        p-small:text-sm p-small:px-[0.625rem] p-small:py-[0.375rem]
        p-large:text-lg p-large:px-[0.875rem] p-large:py-[0.625rem]
        transition-colors duration-200 shadow-[0_1px_2px_0_rgba(18,18,23,0.05)]`,
};

const v2Theme: InputTextPassThroughOptions = {
  root: `ui-v2-body appearance-none rounded-none outline-hidden
        h-11 bg-[var(--ui-v2-surface)] text-[var(--ui-v2-foreground)]
        placeholder:text-[var(--ui-v2-tertiary-foreground)]
        border border-[var(--ui-v2-border)]
        enabled:hover:border-[var(--ui-v2-border)] enabled:focus:border-[var(--ui-v2-primary)]
        disabled:cursor-not-allowed disabled:bg-[var(--ui-v2-surface)] disabled:text-[var(--ui-v2-secondary-foreground)]
        p-invalid:border-[var(--ui-v2-error)] p-invalid:placeholder:text-[var(--ui-v2-error)]
        px-[14px] py-[10px] p-fluid:w-full
        p-small:h-7 p-small:text-[11px] p-small:px-[10px] p-small:py-[6px]
        p-large:h-11 p-large:text-[14px] p-large:px-[14px] p-large:py-[10px]
        transition-colors duration-150`,
};

const theme = computed<InputTextPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
