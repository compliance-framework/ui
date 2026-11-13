<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { SystemSecurityPlan } from '@/oscal';
import { useSystemStore } from '@/stores/system';
import type { DataResponse } from '@/stores/types';
import { getErrorStatus } from '@/utils/httpErrors';
import type { QueryStatus } from '@/ds/query';
import DataState from '@/ds/components/DataState/DataState.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';

/**
 * The frame for every redesigned system page (/systems/:systemId/...). The system in the
 * URL is the source of truth, so links are shareable: opening one makes that system the current
 * system, which keeps the nav, the switcher and the classic system pages in step. Pages render
 * only once the system is known, keyed by it, so each one reads its system once.
 *
 * A system the user may not read is shown as not found, like a missing one: the API documents no
 * per-system 403 yet, and treating both alike never confirms that a hidden system exists.
 */
const route = useRoute();
const api = useAuthenticatedInstance();
const systemStore = useSystemStore();

const systemId = computed(() => String(route.params.systemId ?? ''));
const status = ref<QueryStatus | 'missing'>('loading');

async function resolve(id: string): Promise<void> {
  // Already current: show the page straight away, and refresh the title in the background.
  status.value =
    systemStore.system.securityPlan?.uuid === id ? 'ready' : 'loading';
  try {
    const response = await api.get<DataResponse<SystemSecurityPlan>>(
      `/api/oscal/system-security-plans/${id}`,
    );
    if (systemId.value !== id) return;
    const plan = response.data.data;
    systemStore.setSecurityPlan({ uuid: plan.uuid, metadata: plan.metadata });
    status.value = 'ready';
  } catch (error) {
    if (systemId.value !== id) return;
    const code = getErrorStatus(error);
    status.value =
      code === 400 || code === 403 || code === 404 ? 'missing' : 'error';
  }
}

watch(systemId, (id) => void resolve(id), { immediate: true });
</script>

<template>
  <RouterView v-if="status === 'ready'" :key="systemId" />
  <Stack v-else-if="status === 'missing'" gap="6">
    <PageHeader title="System not found" />
    <DataState
      status="empty"
      subject="systems"
      empty-title="We couldn't find this system"
      empty-body="It may have been deleted, you may not have access to it, or the link may be incomplete."
      icon="systems"
    >
      <template #empty-actions>
        <TextLink :to="{ name: 'systems' }">All systems</TextLink>
      </template>
    </DataState>
  </Stack>
  <DataState
    v-else
    :status="status"
    subject="this system"
    @retry="resolve(systemId)"
  />
</template>
