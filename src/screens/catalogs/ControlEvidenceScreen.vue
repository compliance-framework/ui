<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { Control } from '@/oscal';
import type { Evidence } from '@/stores/evidence';
import { getErrorStatus } from '@/utils/httpErrors';
import { formatDateTime, plural } from '@/ds/format';
import type { QueryStatus } from '@/ds/query';
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Stack from '@/ds/components/layout/Stack.vue';

/**
 * A catalog control's evidence (/catalogs/:catalog/control/:id/evidence): the latest evidence that
 * names the control, across every system. Each row opens its evidence record.
 */
const route = useRoute();
const api = useAuthenticatedInstance();
const controlId = String(route.params.id);

const status = ref<QueryStatus>('loading');
const control = ref<Control>();
const evidence = ref<Evidence[]>([]);

async function load(): Promise<void> {
  status.value = 'loading';
  try {
    const response = await api.get<{
      data: Evidence[] | null;
      metadata: { control: Control };
    }>(`/api/evidence/for-control/${controlId}`);
    control.value = response.data.metadata?.control;
    evidence.value = response.data.data ?? [];
    status.value = evidence.value.length ? 'ready' : 'empty';
  } catch (error) {
    status.value = getErrorStatus(error) === 403 ? 'forbidden' : 'error';
  }
}
void load();

const title = computed(() =>
  control.value
    ? `Evidence for ${control.value.id}`
    : `Evidence for ${controlId}`,
);
const rows = computed(() =>
  evidence.value.map((e) => ({
    id: e.id,
    name: e.title,
    status: e.status?.state ?? '',
    lastSeen: e.end ? formatDateTime(e.end) : 'Not known',
  })),
);
</script>

<template>
  <Stack gap="6">
    <Breadcrumbs
      :crumbs="[
        {
          label: 'Catalog',
          to: { name: 'catalog-view', params: { id: route.params.catalog } },
        },
      ]"
    />
    <PageHeader :title="title" :description="control?.title" />
    <DataState
      :status="status"
      subject="evidence"
      empty-title="No evidence for this control yet"
      empty-body="Evidence appears here when an agent or a person records it against this control."
      icon="evidence"
      @retry="load"
    >
      <DataTable
        :caption="plural(rows.length, 'evidence item')"
        caption-hidden
        :columns="[
          { key: 'status', label: 'Status', nowrap: true },
          { key: 'name', label: 'Evidence', minWidth: 'md' },
          { key: 'lastSeen', label: 'Last seen', nowrap: true },
        ]"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-status="{ row: r }">
          <StatusBadge
            v-if="r.status === 'satisfied' || r.status === 'not-satisfied'"
            :status="r.status"
          />
          <StatusBadge v-else status="unknown" />
        </template>
        <template #cell-name="{ row: r }">
          <TextLink
            :to="{ name: 'evidence:view', params: { evidenceId: r.id } }"
            >{{ r.name }}</TextLink
          >
        </template>
      </DataTable>
    </DataState>
  </Stack>
</template>
