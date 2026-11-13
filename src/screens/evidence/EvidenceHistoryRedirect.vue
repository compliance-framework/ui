<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { Evidence } from '@/stores/evidence';
import type { DataResponse } from '@/stores/types';
import type { QueryStatus } from '@/ds/query';
import DataState from '@/ds/components/DataState/DataState.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';

/**
 * The classic evidence-history URL (/evidence/history/:uuid names a stream, not a record). History
 * is now a tab of the evidence record, so this opens the stream's latest record on that tab.
 */
const route = useRoute();
const router = useRouter();
const api = useAuthenticatedInstance();
const status = ref<QueryStatus>('loading');

async function resolve(): Promise<void> {
  status.value = 'loading';
  try {
    const response = await api.get<DataResponse<Evidence>>(
      `/api/evidence/latest/${String(route.params.uuid)}`,
    );
    await router.replace({
      name: 'evidence:view-history',
      params: { evidenceId: response.data.data.id },
    });
  } catch {
    status.value = 'empty';
  }
}
void resolve();
</script>

<template>
  <Stack gap="6">
    <PageHeader title="Evidence history" />
    <DataState
      :status="status"
      subject="evidence history"
      empty-title="We couldn't find this evidence stream"
      empty-body="It may have been removed, or the link may be incomplete."
      icon="evidence"
      skeleton="text"
    >
      <template #empty-actions>
        <TextLink :to="{ name: 'evidence:index' }">All evidence</TextLink>
      </template>
    </DataState>
  </Stack>
</template>
