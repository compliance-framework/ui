<template>
  <Tabs
    :value="props.value"
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <slot></slot>
  </Tabs>
</template>

<script setup lang="ts">
import Tabs, {
  type TabsPassThroughOptions,
  type TabsProps,
} from 'primevue/tabs';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ TabsProps {}
const props = defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: TabsPassThroughOptions = {
  root: `flex flex-col`,
};

const v2Theme: TabsPassThroughOptions = {
  root: `flex flex-col border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)]`,
};

const theme = computed<TabsPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
