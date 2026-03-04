<template>
  <SelectButton
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </SelectButton>
</template>

<script setup lang="ts">
import SelectButton, {
  type SelectButtonPassThroughOptions,
  type SelectButtonProps,
} from 'primevue/selectbutton';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ SelectButtonProps {}
defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: SelectButtonPassThroughOptions = {
  root: `inline-flex select-none rounded-md
        p-invalid:outline p-invalid:outline-offset-0 p-invalid:outline-red-400 dark:p-invalid:outline-red-300`,
  pcToggleButton: {
    root: `inline-flex items-center justify-center overflow-hidden relative cursor-pointer select-none grow
            border border-ccf-600 dark:border-white
            rounded-none first:rounded-s-md last:rounded-e-md
            bg-gray-50 dark:bg-slate-950
            text-gray-500 dark:text-slate-400
            p-checked:text-gray-700 dark:p-checked:text-white
            text-base font-medium
            focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:relative focus-visible:z-10
            disabled:cursor-default
            disabled:bg-surface-200 disabled:border-surface-200 disabled:text-surface-500
            disabled:dark:bg-surface-700 disabled:dark:border-surface-700 disabled:dark:text-surface-400
            p-invalid:border-red-400 dark:p-invalid:border-red-300
            transition-colors duration-200
            p-1 p-small:text-sm p-large:text-lg
        `,
    content: `relative flex-auto inline-flex items-center justify-center gap-2 py-1 px-3
            rounded-md transition-colors duration-200
            p-checked:bg-gray-200 dark:p-checked:bg-slate-800 p-checked:shadow-[0px_1px_2px_0px_rgba(0,0,0,0.02),0px_1px_2px_0px_rgba(0,0,0,0.04)]`,
    icon: ``,
    label: ``,
  },
};

const v2Theme: SelectButtonPassThroughOptions = {
  root: `inline-flex select-none rounded-none p-invalid:outline p-invalid:outline-offset-0 p-invalid:outline-[var(--ui-v2-error)]`,
  pcToggleButton: {
    root: `inline-flex items-center justify-center overflow-hidden relative cursor-pointer select-none grow
            border border-[var(--ui-v2-border)] rounded-none
            bg-[var(--ui-v2-background)] text-[var(--ui-v2-secondary-foreground)] ui-v2-nav
            p-checked:text-[var(--ui-v2-primary)]
            focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-v2-primary)] focus-visible:relative focus-visible:z-10
            disabled:cursor-default disabled:bg-[var(--ui-v2-surface)] disabled:border-[var(--ui-v2-border)] disabled:text-[var(--ui-v2-secondary-foreground)]
            p-invalid:border-[var(--ui-v2-error)] transition-colors duration-150 p-1 p-small:text-[11px] p-large:text-[13px]`,
    content: `relative flex-auto inline-flex items-center justify-center gap-2 py-1 px-3
            rounded-none transition-colors duration-150
            p-checked:bg-[var(--ui-v2-primary-tint-10)]`,
    icon: ``,
    label: ``,
  },
};

const theme = computed<SelectButtonPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
