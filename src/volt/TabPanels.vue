<template>
  <TabPanels
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <slot></slot>
  </TabPanels>
</template>

<script setup lang="ts">
import TabPanels, {
  type TabPanelsPassThroughOptions,
  type TabPanelsProps,
} from 'primevue/tabpanels';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ TabPanelsProps {}
defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: TabPanelsPassThroughOptions = {
  root: `bg-surface-0 dark:bg-surface-900 text-surface-700 dark:text-surface-0
        pt-[0.875rem] pb-[1.125rem] px-[1.125rem] outline-none`,
};

const v2Theme: TabPanelsPassThroughOptions = {
  root: `bg-[var(--ui-v2-card)] text-[var(--ui-v2-foreground)] pt-4 pb-5 px-4 outline-none`,
};

const theme = computed<TabPanelsPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
