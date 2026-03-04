<template>
  <Tab
    :value="props.value"
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <slot></slot>
  </Tab>
</template>

<script setup lang="ts">
import Tab, { type TabPassThroughOptions, type TabProps } from 'primevue/tab';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ TabProps {}
const props = defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: TabPassThroughOptions = {
  root: `flex-shrink-0 cursor-pointer select-none relative whitespace-nowrap py-4 px-[1.125rem]
        border-b border-ccf-200 dark:border-slate-700 font-semibold
        text-ccf-700 dark:text-slate-400
        transition-colors duration-200 -mb-px
        not-p-active:enabled:hover:text-surface-700 dark:not-p-active:enabled:hover:text-surface-0
        p-active:border-primary p-active:text-primary
        disabled:pointer-events-none disabled:opacity-60
        focus-visible:z-10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-primary`,
};

const v2Theme: TabPassThroughOptions = {
  root: `flex-shrink-0 cursor-pointer select-none relative whitespace-nowrap py-3 px-4 ui-v2-nav
        border-b border-[var(--ui-v2-border)] text-[var(--ui-v2-secondary-foreground)]
        transition-colors duration-150 -mb-px
        not-p-active:enabled:hover:text-[var(--ui-v2-primary)]
        p-active:border-[var(--ui-v2-primary)] p-active:text-[var(--ui-v2-primary)] p-active:bg-[var(--ui-v2-surface)]
        disabled:pointer-events-none disabled:opacity-60
        focus-visible:z-10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-[var(--ui-v2-primary)]`,
};

const theme = computed<TabPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
