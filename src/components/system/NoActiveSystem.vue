<template>
  <div
    class="mx-auto mt-8 max-w-2xl rounded-lg border border-dashed border-ccf-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"
  >
    <template v-if="noSystemsYet">
      <h3 class="text-xl font-semibold text-gray-900 dark:text-slate-100">
        Create your first system
      </h3>
      <p class="mt-2 text-gray-600 dark:text-slate-400">
        Everything under <strong>This System</strong> (implementation,
        compliance, risks and workflows) is organised around a System Security
        Plan. Create one to get started.
      </p>
      <div class="mt-6 flex justify-center">
        <RouterLinkButton
          v-if="canCreate"
          :to="{ name: 'system-security-plans-create' }"
        >
          Create a system
        </RouterLinkButton>
        <p v-else class="text-sm text-gray-500 dark:text-slate-400">
          Ask an administrator to create a system for you.
        </p>
      </div>
    </template>
    <template v-else>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-slate-100">
        Select a system
      </h3>
      <p class="mt-2 text-gray-600 dark:text-slate-400">
        Pick the system you want to work on from the
        <strong>Active System</strong> menu at the top of the page. Everything
        under <strong>This System</strong> will then show that system's
        {{ subject }}.
      </p>
      <div class="mt-6 flex justify-center">
        <RouterLinkButton
          :to="{ name: 'system-security-plans' }"
          variant="outlined"
        >
          Browse all systems
        </RouterLinkButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import RouterLinkButton from '@/components/RouterLinkButton.vue';
import { useSystemStore } from '@/stores/system';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

withDefaults(
  defineProps<{
    // What the page would show, e.g. "risks"; used in the "select a system" copy.
    subject?: string;
  }>(),
  { subject: 'data' },
);

const systemStore = useSystemStore();
const { can } = usePermissions();

const canCreate = computed(() => can(RESOURCES.SSP, ACTIONS.CREATE));
const noSystemsYet = computed(
  () => systemStore.availablePlansLoaded && !systemStore.availablePlans.length,
);
</script>
