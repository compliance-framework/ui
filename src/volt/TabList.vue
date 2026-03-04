<template>
  <TabList
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <slot></slot>
  </TabList>
</template>

<script setup lang="ts">
import TabList, {
  type TabListPassThroughOptions,
  type TabListProps,
} from 'primevue/tablist';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ TabListProps {}
defineProps<Props>();

const isV2Route = useIsV2Route();

const navButton = `!absolute flex-shrink-0 top-0 z-20 h-full flex items-center justify-center cursor-pointer
        bg-surface-0 dark:bg-surface-900 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-0 w-10
        shadow-[0px_0px_10px_50px_rgba(255,255,255,0.6)] dark:shadow-[0px_0px_10px_50px] dark:shadow-surface-900/50
        focus-visible:z-10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-primary
        transition-colors duration-200`;

const legacyTheme: TabListPassThroughOptions = {
  root: `flex relative border-b border-b-ccf-300 dark:border-b-slate-700`,
  prevButton: navButton + ` start-0`,
  nextButton: navButton + ` end-0`,
  content: `flex-grow
        p-scrollable:overflow-x-auto p-scrollable:overflow-y-hidden p-scrollable:overscroll-y-contain p-scrollable:overscroll-x-auto
        scroll-smooth [scrollbar-width:none] text-zinc-800 dark:text-zinc-50`,
  tabList: `relative flex bg-surface-0 dark:bg-surface-900
        p-scrollable:overflow-hidden`,
  activeBar: `z-10 block absolute -bottom-px h-px bg-primary transition-[left] duration-200 ease-[cubic-bezier(0.35,0,0.25,1)]`,
};

const v2NavButton = `!absolute flex-shrink-0 top-0 z-20 h-full flex items-center justify-center cursor-pointer w-10
        bg-[var(--ui-v2-card)] text-[var(--ui-v2-secondary-foreground)]
        hover:text-[var(--ui-v2-primary)]
        shadow-[0px_0px_10px_50px_var(--ui-v2-card)]
        focus-visible:z-10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-[var(--ui-v2-primary)]
        transition-colors duration-150`;

const v2Theme: TabListPassThroughOptions = {
  root: `flex relative border-b border-b-[var(--ui-v2-border)] bg-[var(--ui-v2-card)]`,
  prevButton: v2NavButton + ' start-0',
  nextButton: v2NavButton + ' end-0',
  content: `flex-grow p-scrollable:overflow-x-auto p-scrollable:overflow-y-hidden p-scrollable:overscroll-y-contain p-scrollable:overscroll-x-auto
        scroll-smooth [scrollbar-width:none] text-[var(--ui-v2-foreground)]`,
  tabList: `relative flex bg-[var(--ui-v2-card)] p-scrollable:overflow-hidden`,
  activeBar:
    'z-10 block absolute -bottom-px h-px bg-[var(--ui-v2-primary)] transition-[left] duration-150 ease-[cubic-bezier(0.35,0,0.25,1)]',
};

const theme = computed<TabListPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
