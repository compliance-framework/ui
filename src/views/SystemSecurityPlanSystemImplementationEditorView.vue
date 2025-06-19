<template>
  <h4 class="text-lg">Users</h4>

  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <CollapsableGroup v-for="user in users" :key="user.uuid">
      <template #header>
        <div class="py-2 px-4 text-lg">
          {{ user.title }}
        </div>
      </template>
      <div class="px-4 py-4 dark:bg-slate-950 border-b dark:border-slate-700">
        <p>
          {{ user.description }}
        </p>

        <h4 class="text-lg font-medium mb-4">Roles</h4>

        <p v-for="role in user?.roleIds" :key="role">{{ role }}</p>

        <h4 class="text-lg font-medium my-4">Authorized Privileges</h4>

        <div v-for="privilege in user?.authorizedPrivileges" :key="privilege.title" class="pb-4">
          <p>{{ privilege.title }}</p>
          <ul class="list-disc pl-4">
            <li v-for="perf in privilege.functionsPerformed" :key="perf">{{ perf}}</li>
          </ul>
        </div>
      </div>
    </CollapsableGroup>
  </div>

  <h4 class="text-lg">Components</h4>

  <div
    class="my-4 rounded-md bg-white dark:bg-slate-900 border-collapse border border-ccf-300 dark:border-slate-700"
  >
    <CollapsableGroup v-for="component in components" :key="component.uuid">
      <template #header>
        <div class="py-2 px-4 text-lg flex items-center justify-between">
          <h3>
            {{ component.title }}
            <span
              class="ml-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-gray-800 dark:text-slate-300 rounded-md text-sm whitespace-nowrap px-4 py-1"
            >{{ component.type }}</span>
          </h3>
          <div :class="{
            'rounded-full capitalize px-2 py-1 text-sm font-light': true,
            'bg-green-400 dark:bg-green-700': component.status.state == `operational`,
            'bg-amber-600': component.status.state != `operational`,
          }">
            {{ component.status.state }}
          </div>
        </div>
      </template>
      <div class="px-4 py-4 dark:bg-slate-950 border-b dark:border-slate-700">
        <p>
          {{ component.description }}
        </p>

        <h4 class="text-lg font-medium mb-4">Purpose</h4>

        <p>
          {{ component.purpose }}
        </p>

        <h4 class="text-lg font-medium mb-4">Remarks</h4>

        <p>
          {{ component.remarks }}
        </p>

        <h4 class="text-lg font-medium my-4">Protocols</h4>

        <div v-for="protocol in component.protocols" :key="protocol.uuid" class="pb-4">
          <p>{{ protocol.title }}</p>

          <p>{{ protocol.name }}</p>
          <ul class="list-disc pl-4">
            <li v-for="range in protocol.portRanges" :key="range.transport">{{ range.transport }}: {{ range.start }}-{{ range.end }}</li>
          </ul>
        </div>
      </div>
    </CollapsableGroup>
  </div>


</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  type SystemComponent,
  type SystemImplementationUser,
  type SystemSecurityPlan,
  useSystemSecurityPlanStore
} from '@/stores/system-security-plans.ts'
import { useRoute } from 'vue-router';
import type { DataResponse } from '@/stores/types.ts'
import CollapsableGroup from '@/components/CollapsableGroup.vue'

const route = useRoute();
const id = route.params.id as string;
const sspStore = useSystemSecurityPlanStore();

const systemSecurityPlan = ref<SystemSecurityPlan | null>(null);
const users = ref<SystemImplementationUser[] | null>(null);
const components = ref<SystemComponent[] | null>(null);
onMounted(() => {
  sspStore.get(id).then((data) => {
    systemSecurityPlan.value = data.data;
  });
  sspStore.getSystemImplementationUsers(id).then((data: DataResponse<SystemImplementationUser[]>) => {
    users.value = data.data;
  });
  sspStore.getSystemImplementationComponents(id).then((data: DataResponse<SystemComponent[]>) => {
    components.value = data.data;
  });
});
</script>
