<template>
  <NoActiveSystem v-if="!systemSecurityPlan" subject="configuration" />
  <div v-else>
    <PageSubHeader>{{ systemSecurityPlan.metadata?.title }}</PageSubHeader>

    <div>
      <PageHeader>Configure System</PageHeader>
      <Tabs :value="activeRoute">
        <TabList>
          <Tab
            v-for="tab in tabs"
            :key="tab.label"
            :value="tab.route"
            as="div"
            class="flex items-center gap-2"
          >
            <RouterLink :to="{ name: tab.route }">
              {{ tab.label }}
            </RouterLink>
          </Tab>
        </TabList>
      </Tabs>
    </div>

    <RouterView v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </RouterView>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import NoActiveSystem from '@/components/system/NoActiveSystem.vue';
import { type SystemSecurityPlan } from '@/oscal';
import { RouterView, useRoute } from 'vue-router';
import { useSystemStore } from '@/stores/system.ts';
import Tabs from '@/volt/Tabs.vue';
import Tab from '@/volt/Tab.vue';
import TabList from '@/volt/TabList.vue';
import { sspSectionTabRoutes } from '@/constants/ssp-section-tabs';

// The layout remounts this page whenever the active system changes, so a one-off read of
// the store is enough here.
const { system } = useSystemStore();
const systemSecurityPlan = ref<SystemSecurityPlan>(
  system.securityPlan as SystemSecurityPlan,
);

const route = useRoute();
const activeRoute = ref(route.name as string);
// Risks and Compliance have their own This System nav entries, so Configure System leaves
// them out.
const tabs = sspSectionTabRoutes('system:', { includeEditorOnly: false });
</script>
