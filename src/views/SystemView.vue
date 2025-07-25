<template>
  <PageHeader>System Security Plan</PageHeader>
  <PageSubHeader>{{ systemSecurityPlan.metadata?.title }}</PageSubHeader>

  <div>
    <Tabs :value="activeRoute as string">
      <TabList>
        <Tab v-for="tab in [
          {label: 'Overview', route: 'system:overview'},
          {label: 'System Users', route: 'system:users'},
          {label: 'System Components', route: 'system:components'},
          {label: 'Leveraged Authorizations', route: 'system:authorizations'},
          ]" :key="tab.label" :value="tab.route" as="div" class="flex items-center gap-2">
          <RouterLink
            :to="{ name: tab.route }"
          >
            {{ tab.label}}
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
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import {
  type SystemSecurityPlan,
} from '@/stores/system-security-plans.ts';
import { RouterView, useRoute } from 'vue-router'
import { useSystemStore } from '@/stores/system.ts';
import Tabs from '@/volt/Tabs.vue'
import Tab from '@/volt/Tab.vue'
import TabList from '@/volt/TabList.vue'

const { system } = useSystemStore();
const systemSecurityPlan = ref<SystemSecurityPlan>(system.securityPlan as SystemSecurityPlan);

const route = useRoute();
const activeRoute = ref(route.name)
</script>
