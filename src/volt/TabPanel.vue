<template>
  <TabPanel
    :value="props.value"
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <slot></slot>
  </TabPanel>
</template>

<script setup lang="ts">
import TabPanel, {
  type TabPanelPassThroughOptions,
  type TabPanelProps,
} from 'primevue/tabpanel';
import { computed } from 'vue';
import { ptViewMerge } from './utils';
import { useIsV2Route } from './useRouteUiVersion';

interface Props extends /* @vue-ignore */ TabPanelProps {}
const props = defineProps<Props>();

const isV2Route = useIsV2Route();

const legacyTheme: TabPanelPassThroughOptions = {
  root: ``,
};

const v2Theme: TabPanelPassThroughOptions = {
  root: ``,
};

const theme = computed<TabPanelPassThroughOptions>(() =>
  isV2Route.value ? v2Theme : legacyTheme,
);
</script>
