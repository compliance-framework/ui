<template>
  <div v-if="isV2SystemRoute" class="space-y-6">
    <nav
      class="flex overflow-x-auto border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)]"
    >
      <RouterLink
        v-for="tab in tabs"
        :key="tab.route"
        :to="{ name: tab.route }"
        class="ui-v2-nav border-r border-[var(--ui-v2-border)] px-4 py-3 whitespace-nowrap"
        :class="
          activeRoute === tab.route
            ? 'bg-[var(--ui-v2-primary-tint-15)] text-[var(--ui-v2-foreground)]'
            : 'text-[var(--ui-v2-secondary-foreground)]'
        "
      >
        {{ tab.label }}
      </RouterLink>
    </nav>
    <RouterView v-slot="{ Component }">
      <KeepAlive><component :is="Component" /></KeepAlive>
    </RouterView>
  </div>

  <Message v-else-if="!systemSecurityPlan" severity="error" variant="outlined">
    <div class="space-y-2 text-gray-700 dark:text-slate-200">
      <h4 class="text-base font-semibold">System Security Plan not selected</h4>
      <p>You have not selected a system security plan for editing.</p>
      <p>
        Please return to the
        <RouterLink
          :to="{ name: 'system-security-plans' }"
          class="font-medium underline text-blue-600 dark:text-blue-300"
          >SSP Page
        </RouterLink>
        to select one
      </p>
    </div>
  </Message>

  <div v-else>
    <PageSubHeader>{{ systemSecurityPlan.metadata?.title }}</PageSubHeader>

    <div>
      <PageHeader>System Security Plan</PageHeader>
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
import { computed } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import { type SystemSecurityPlan } from '@/oscal';
import { RouterView, useRoute } from 'vue-router';
import { useSystemStore } from '@/stores/system.ts';
import Tabs from '@/volt/Tabs.vue';
import Tab from '@/volt/Tab.vue';
import TabList from '@/volt/TabList.vue';
import Message from '@/volt/Message.vue';
import { sspSectionTabRoutes } from '@/constants/ssp-section-tabs';

const { system } = useSystemStore();
const route = useRoute();

const systemSecurityPlan = computed(
  () => system.securityPlan as SystemSecurityPlan | undefined,
);

const activeRoute = computed(() => route.name as string);
const tabs = sspSectionTabRoutes('system:');
const isV2SystemRoute = computed(() => route.meta.uiVersion === 'v2');
</script>
