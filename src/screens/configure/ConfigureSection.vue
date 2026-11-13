<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import LegacyPage from '@/views/layouts/LegacyPage.vue';
import {
  CONFIGURE_SECTIONS,
  asyncSection,
  sectionRouteName,
} from './configureSections';

/**
 * One section of Configure System: the classic SSP view for that section, as a legacy island,
 * given the system from the URL. Components also gets its dashboard drawer routes.
 */
const route = useRoute();
const systemId = computed(() => String(route.params.systemId));
const section = computed(
  () =>
    CONFIGURE_SECTIONS.find((s) => sectionRouteName(s.suffix) === route.name) ??
    CONFIGURE_SECTIONS.find((s) => s.suffix === 'components')!,
);
const component = computed(() => asyncSection(section.value));
const extra = computed(() =>
  section.value.suffix === 'components'
    ? {
        dashboardRouteName: 'system-configure-component-dashboards',
        dashboardClosePath: `/systems/${systemId.value}/configure/components`,
      }
    : {},
);
</script>

<template>
  <LegacyPage>
    <component
      :is="component"
      :key="`${section.suffix}:${systemId}`"
      :ssp-id="systemId"
      v-bind="extra"
    />
  </LegacyPage>
</template>
