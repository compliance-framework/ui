<template>
  <Message v-if="!systemSecurityPlan" severity="error" variant="outlined">
    <h4 class="font-bold">System Security Plan not selected</h4>
    <p>You have not selected a system security plan for editing.</p>
    <p>
      Please return to the
      <RouterLink :to="{ name: 'system-security-plans' }" class="underline"
        >SSP Page
      </RouterLink>
      to select one
    </p>
  </Message>
  <div v-else>
    <PageSubHeader>{{ systemSecurityPlan.metadata?.title }}</PageSubHeader>

    <div>
      <PageHeader>System Security Plan</PageHeader>
      <Tabs :value="activeRoute">
        <TabList>
          <Tab
            v-for="tab in [
              { label: 'Overview', route: 'system:overview' },
              { label: 'System Users', route: 'system:users' },
              { label: 'System Components', route: 'system:components' },
              {
                label: 'Leveraged Authorizations',
                route: 'system:authorizations',
              },
            ]"
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
import { type SystemSecurityPlan } from '@/oscal';
import { RouterView, useRoute } from 'vue-router';
import { useSystemStore } from '@/stores/system.ts';
import Tabs from '@/volt/Tabs.vue';
import Tab from '@/volt/Tab.vue';
import TabList from '@/volt/TabList.vue';
import Message from '@/volt/Message.vue';

const { system } = useSystemStore();
const systemSecurityPlan = ref<SystemSecurityPlan>(
  system.securityPlan as SystemSecurityPlan,
);

const route = useRoute();
const activeRoute = ref(route.name as string);
</script>
