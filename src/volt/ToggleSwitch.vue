<template>
  <ToggleSwitch
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
  </ToggleSwitch>
</template>

<script setup lang="ts">
import ToggleSwitch, {
  type ToggleSwitchPassThroughOptions,
  type ToggleSwitchProps,
} from 'primevue/toggleswitch';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ ToggleSwitchProps {}
defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: ToggleSwitchPassThroughOptions = {
  root: 'inline-block relative',
  input: `peer absolute top-0 left-0 w-full h-full opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed`,
  slider: `relative w-11 h-6 rounded-full border border-surface-300 dark:border-surface-700
          bg-surface-200 dark:bg-surface-700 transition-colors duration-200
          peer-checked:bg-primary peer-checked:border-primary
          peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary
          peer-disabled:opacity-60`,
  handle: `absolute top-1/2 -translate-y-1/2 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-all duration-200
          peer-checked:left-[calc(100%-1.25rem)]`,
};

const v2Theme: ToggleSwitchPassThroughOptions = {
  root: 'inline-block relative h-6 w-11',
  input: `peer absolute top-0 left-0 w-full h-full opacity-0 z-10 cursor-pointer disabled:cursor-not-allowed`,
  slider: `relative w-11 h-6 rounded-none border border-[var(--ui-v2-border)]
          bg-[var(--ui-v2-surface)] transition-colors duration-150
          peer-checked:bg-[var(--ui-v2-primary)] peer-checked:border-[var(--ui-v2-primary)]
          peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ui-v2-primary)]
          peer-disabled:opacity-60`,
  handle: ({ context }) => ({
    class: `absolute left-0.5 top-0.5 h-4 w-4 rounded-none border border-[var(--ui-v2-border)]
            bg-[var(--ui-v2-background)] transition-transform duration-150`,
    style: {
      transform: context.checked ? 'translateX(22px)' : 'translateX(0px)',
    },
  }),
};

const theme = computed<ToggleSwitchPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
