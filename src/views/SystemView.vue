<template>
  <PageHeader>System Security Plan</PageHeader>
  <PageSubHeader v-if="systemSecurityPlan?.metadata">{{ systemSecurityPlan.metadata.title }}</PageSubHeader>
  
  <div v-if="!systemSecurityPlan?.uuid" class="p-4">
    <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
      <p class="text-yellow-800">No System Security Plan selected. Please go to the <RouterLink to="/system-security-plans" class="text-blue-600 hover:text-blue-800 underline">System Security Plans</RouterLink> page and select a plan.</p>
    </div>
  </div>

  <div v-else>
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
import { ref, computed } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import {
  type SystemSecurityPlan,
} from '@/stores/system-security-plans.ts';
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { useSystemStore } from '@/stores/system.ts';
import Tabs from '@/volt/Tabs.vue'
import Tab from '@/volt/Tab.vue'
import TabList from '@/volt/TabList.vue'

const { system } = useSystemStore();
// Use computed to make it reactive to system store changes
const systemSecurityPlan = computed(() => system.securityPlan || {} as SystemSecurityPlan);

const route = useRoute();
const activeRoute = ref(route.name)
</script>
