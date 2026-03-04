<template>
  <RadioButton
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
  </RadioButton>
</template>

<script setup lang="ts">
import RadioButton, {
  type RadioButtonPassThroughOptions,
  type RadioButtonProps,
} from 'primevue/radiobutton';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ RadioButtonProps {}
defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: RadioButtonPassThroughOptions = {
  root: 'relative inline-flex select-none w-5 h-5 align-bottom',
  input: `peer cursor-pointer disabled:cursor-default appearance-none
          absolute start-0 top-0 w-full h-full m-0 p-0 opacity-0 z-10 border border-transparent rounded-full`,
  box: `flex justify-center items-center rounded-full w-5 h-5
          border border-surface-300 dark:border-surface-700
          bg-surface-0 dark:bg-surface-950
          text-surface-700 dark:text-surface-0
          peer-enabled:peer-hover:border-surface-400 dark:peer-enabled:peer-hover:border-surface-600
          p-checked:border-primary p-checked:bg-primary
          peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-focus-visible:outline
          p-disabled:bg-surface-200 dark:p-disabled:bg-surface-400 p-disabled:border-surface-300 dark:p-disabled:border-surface-700
          transition-colors duration-200`,
  icon: 'rounded-full bg-primary-contrast w-2 h-2 transition-none',
};

const v2Theme: RadioButtonPassThroughOptions = {
  root: 'relative inline-flex select-none w-5 h-5 align-bottom',
  input: `peer cursor-pointer disabled:cursor-default appearance-none
          absolute start-0 top-0 w-full h-full m-0 p-0 opacity-0 z-10 border border-transparent rounded-full`,
  box: `flex justify-center items-center rounded-full w-5 h-5
          border border-[var(--ui-v2-border)]
          bg-[var(--ui-v2-background)]
          peer-enabled:peer-hover:border-[var(--ui-v2-primary)]
          p-checked:border-[var(--ui-v2-primary)] p-checked:bg-[var(--ui-v2-primary)]
          peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ui-v2-primary)] peer-focus-visible:outline
          p-disabled:bg-[var(--ui-v2-surface)] p-disabled:border-[var(--ui-v2-border)]
          transition-colors duration-150`,
  icon: 'rounded-full bg-[var(--ui-v2-primary-foreground)] w-2 h-2 transition-none',
};

const theme = computed<RadioButtonPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
