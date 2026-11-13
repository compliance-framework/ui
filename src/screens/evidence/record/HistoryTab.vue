<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { Evidence } from '@/stores/evidence';
import type { DataResponse } from '@/stores/types';
import { formatLocalDateTime } from '@/ds/format';
import type { QueryStatus } from '@/ds/query';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import type { StatusKey } from '@/ds/components/StatusBadge/statuses';
import Tag from '@/ds/components/Tag/Tag.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import EvidenceTrends from '../EvidenceTrends.vue';
import { ZERO_UUID, useEvidenceRecord } from './evidenceRecord';

/**
 * History: every record in this evidence stream, newest first, each opening in place, with the
 * stream's status trend and agent health below, as on the classic page.
 */
const { evidence, link } = useEvidenceRecord();
const api = useAuthenticatedInstance();

const uuid = computed(() => evidence.value?.uuid);
const hasStream = computed(
  () => Boolean(uuid.value) && uuid.value !== ZERO_UUID,
);
const status = ref<QueryStatus>('loading');
const history = ref<Evidence[]>([]);

async function load(): Promise<void> {
  if (!hasStream.value) {
    status.value = 'empty';
    return;
  }
  status.value = 'loading';
  try {
    const response = await api.get<DataResponse<Evidence[]>>(
      `/api/evidence/history/${uuid.value}`,
    );
    history.value = response.data.data ?? [];
    status.value = history.value.length ? 'ready' : 'empty';
  } catch {
    status.value = 'error';
  }
}
void load();

const rows = computed(() =>
  [...history.value]
    .sort((a, b) => Date.parse(b.end) - Date.parse(a.end))
    .map((item) => {
      const state = item.status?.state?.toLowerCase();
      return {
        id: item.id,
        status: (state === 'satisfied' || state === 'not-satisfied'
          ? state
          : 'unknown') as StatusKey,
        title: item.title,
        collected: item.end,
        current: item.id === evidence.value?.id,
      };
    }),
);
</script>

<template>
  <Stack gap="6">
    <Panel title="Records in this stream">
      <DataState
        :status="status"
        subject="history"
        empty-title="No history"
        empty-body="This record is the only one in its stream."
        icon="evidence"
        heading-level="none"
        @retry="load"
      >
        <DataTable
          caption="Records in this evidence stream, newest first"
          caption-hidden
          :columns="[
            { key: 'status', label: 'Status', nowrap: true },
            { key: 'title', label: 'Evidence', minWidth: 'md' },
            { key: 'collected', label: 'Collected', nowrap: true },
          ]"
          :rows="rows"
          :row-key="(r) => r.id"
        >
          <template #cell-status="{ row: r }"
            ><StatusBadge :status="r.status"
          /></template>
          <template #cell-title="{ row: r }">
            <Tag v-if="r.current" label="This record" />
            <TextLink v-else :to="link('', r.id)">{{ r.title }}</TextLink>
          </template>
          <template #cell-collected="{ row: r }">{{
            formatLocalDateTime(r.collected)
          }}</template>
        </DataTable>
      </DataState>
    </Panel>

    <EvidenceTrends
      v-if="hasStream"
      :endpoint="`/api/evidence/status-over-time/${uuid}`"
      subject="this stream"
    />
  </Stack>
</template>
