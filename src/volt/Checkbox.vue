<template>
  <Checkbox
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
  </Checkbox>
</template>

<script setup lang="ts">
import Checkbox, {
  type CheckboxPassThroughOptions,
  type CheckboxProps,
} from 'primevue/checkbox';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ CheckboxProps {}
defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: CheckboxPassThroughOptions = {
  root: `relative inline-flex select-none w-5 h-5 align-bottom`,
  input: `peer cursor-pointer disabled:cursor-default appearance-none
          absolute start-0 top-0 w-full h-full m-0 p-0 opacity-0 z-10 border border-transparent rounded-xs`,
  box: `flex justify-center items-center rounded-sm w-5 h-5
          border border-surface-300 dark:border-surface-700
          bg-surface-0 dark:bg-surface-950
          text-surface-700 dark:text-surface-0
          peer-enabled:peer-hover:border-surface-400 dark:peer-enabled:peer-hover:border-surface-600
          p-checked:border-primary p-checked:bg-primary p-checked:text-primary-contrast
          p-indeterminate:border-primary p-indeterminate:bg-primary p-indeterminate:text-primary-contrast
          peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-focus-visible:outline
          p-disabled:bg-surface-200 dark:p-disabled:bg-surface-400 p-disabled:border-surface-300 dark:p-disabled:border-surface-700 p-disabled:text-surface-700 dark:p-disabled:text-surface-400
          shadow-[0_1px_2px_0_rgba(18,18,23,0.05)] transition-colors duration-200`,
  icon: `text-sm w-[0.875rem] h-[0.875rem] transition-none`,
};

const v2Theme: CheckboxPassThroughOptions = {
  root: `relative inline-flex select-none w-5 h-5 align-bottom`,
  input: `peer cursor-pointer disabled:cursor-default appearance-none
          absolute start-0 top-0 w-full h-full m-0 p-0 opacity-0 z-10 border border-transparent rounded-none`,
  box: `flex justify-center items-center rounded-none w-5 h-5
          border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] text-[var(--ui-v2-foreground)]
          peer-enabled:peer-hover:border-[var(--ui-v2-primary)]
          p-checked:border-[var(--ui-v2-primary)] p-checked:bg-[var(--ui-v2-primary)] p-checked:text-[var(--ui-v2-primary-foreground)]
          p-indeterminate:border-[var(--ui-v2-primary)] p-indeterminate:bg-[var(--ui-v2-primary)] p-indeterminate:text-[var(--ui-v2-primary-foreground)]
          peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ui-v2-primary)] peer-focus-visible:outline
          p-disabled:bg-[var(--ui-v2-surface)] p-disabled:border-[var(--ui-v2-border)] p-disabled:text-[var(--ui-v2-secondary-foreground)]
          transition-colors duration-150`,
  icon: `text-sm w-[0.875rem] h-[0.875rem] transition-none`,
};

const theme = computed<CheckboxPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
