<template>
  <div class="flex items-center gap-2">
    <label
      for="active-system-select"
      class="text-sm font-medium text-gray-700 dark:text-slate-200 whitespace-nowrap"
    >
      Active System:
    </label>
    <Select
      input-id="active-system-select"
      :model-value="activeId"
      :options="options"
      option-label="title"
      option-value="uuid"
      :loading="loading"
      :placeholder="placeholder"
      :filter="options.length > 8"
      class="min-w-64 max-w-md"
      :class="{
        'ring-2 ring-amber-400 dark:ring-amber-500':
          !activeId && systemStore.availablePlansLoaded,
      }"
      aria-label="Active system"
      @update:model-value="select"
      @show="loadPlans"
    >
      <template #footer>
        <div
          class="flex items-center justify-between gap-2 border-t border-ccf-200 dark:border-slate-700 px-3 py-2 text-sm"
        >
          <RouterLink
            :to="{ name: 'system-security-plans' }"
            class="text-blue-600 hover:underline dark:text-blue-300"
          >
            Manage systems…
          </RouterLink>
          <RouterLink
            v-if="canCreate"
            :to="{ name: 'system-security-plans-create' }"
            class="text-blue-600 hover:underline dark:text-blue-300"
          >
            + New system
          </RouterLink>
        </div>
      </template>
    </Select>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Select from '@/volt/Select.vue';
import type { SystemSecurityPlan } from '@/oscal';
import { useAuthenticatedInstance } from '@/composables/axios';
import { useSystemStore } from '@/stores/system';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type { DataResponse } from '@/stores/types';

const systemStore = useSystemStore();
const api = useAuthenticatedInstance();
const { can } = usePermissions();
const loading = ref(false);

const canCreate = computed(() => can(RESOURCES.SSP, ACTIONS.CREATE));
const activeId = computed(() => systemStore.system.securityPlan?.uuid ?? null);

const options = computed(() => {
  const list = systemStore.availablePlans.map((plan) => ({
    uuid: plan.uuid,
    title: plan.metadata?.title || plan.uuid,
  }));
  // Until the list loads, still show the persisted active system's name.
  const active = systemStore.system.securityPlan;
  if (active && !list.some((item) => item.uuid === active.uuid)) {
    list.unshift({
      uuid: active.uuid,
      title: active.metadata?.title || active.uuid,
    });
  }
  return list;
});

const placeholder = computed(() => {
  if (!systemStore.availablePlansLoaded) return 'Loading systems…';
  return systemStore.availablePlans.length
    ? 'Select a system'
    : 'No systems yet';
});

async function loadPlans() {
  loading.value = true;
  try {
    const response = await api.get<DataResponse<SystemSecurityPlan[]>>(
      '/api/oscal/system-security-plans',
    );
    systemStore.setAvailablePlans(response.data.data ?? []);
  } catch {
    // Leave the current list in place; the 401/403 interceptors handle auth errors.
  } finally {
    loading.value = false;
  }
}

function select(uuid: string | null) {
  const plan = systemStore.availablePlans.find((item) => item.uuid === uuid);
  if (plan) {
    systemStore.setSecurityPlan(plan);
  }
}

onMounted(loadPlans);
</script>
