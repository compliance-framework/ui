<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useSystemStore } from '@/stores/system';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Tabs from '@/ds/components/Tabs/Tabs.vue';
import { CONFIGURE_SECTIONS, sectionRouteName } from './configureSections';

/**
 * Configure System (/systems/:systemId/configure/...): the system's security plan by section,
 * each section its own route. The old SSP Editor (/system-security-plans/:id/...) leads here too.
 */
const route = useRoute();
const systemStore = useSystemStore();
const systemId = computed(() => String(route.params.systemId));
const systemName = computed(
  () => systemStore.system.securityPlan?.metadata.title ?? 'this system',
);
const tabs = computed(() =>
  CONFIGURE_SECTIONS.filter((s) => s.tab).map((s) => ({
    label: s.label,
    to: {
      name: sectionRouteName(s.suffix),
      params: { systemId: systemId.value },
    },
  })),
);
</script>

<template>
  <Stack gap="6">
    <PageHeader
      title="Configure System"
      :description="`The security plan for ${systemName}.`"
    />
    <Tabs :label="`Configure ${systemName}: sections`" :tabs="tabs">
      <RouterView />
    </Tabs>
  </Stack>
</template>
