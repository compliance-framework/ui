<script setup lang="ts">
/**
 * The systems a system template has created, on its page: the label values each was created
 * for (kept verbatim), the system (or "deleted"), when it was created and last seen, any error
 * or skipped values, and Forget for deleted ones, so the next discovery run can create them
 * again.
 */
import { computed, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import { useAuthenticatedInstance } from '@/composables/axios';
import {
  formatKeyValues,
  SSP_TEMPLATE_INSTANCES_STOP_PATHS,
  type SspTemplateInstance,
} from '@/types/ssp-templates';
import { getErrorDetail } from '@/utils/httpErrors';
import { formatDateTime, plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import type { DataTableColumn } from '@/ds/components/DataTable/types';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ templateId: string }>();

const toast = useToast();
const api = useAuthenticatedInstance();

const url = computed(() => `/api/admin/ssp-templates/${props.templateId}/ssps`);
const instances = useApiQuery<SspTemplateInstance[]>(url, {
  isEmpty: (list) => list.length === 0,
  config: { camelcaseStopPaths: [...SSP_TEMPLATE_INSTANCES_STOP_PATHS] },
});

const rows = computed(() =>
  (instances.data.value ?? []).map((instance, index) => ({
    id: instance.keyHash ?? `${instance.title}-${index}`,
    keyValues: formatKeyValues(instance.keyValues),
    created: formatDateTime(instance.createdAt),
    lastSeen: formatDateTime(instance.lastSeenAt),
    instance,
  })),
);
const columns: DataTableColumn[] = [
  { key: 'keyValues', label: 'Label values', minWidth: 'sm' },
  { key: 'system', label: 'System' },
  { key: 'created', label: 'Created', nowrap: true },
  { key: 'lastSeen', label: 'Last seen', nowrap: true },
  { key: 'problems', label: 'Problems' },
];

const forgetting = ref<SspTemplateInstance>();
const forgetOpen = computed({
  get: () => Boolean(forgetting.value),
  set: (open: boolean) => {
    if (!open) forgetting.value = undefined;
  },
});

async function forget() {
  const instance = forgetting.value;
  forgetting.value = undefined;
  if (!instance?.keyHash) return;
  try {
    await api.delete(`${url.value}/${encodeURIComponent(instance.keyHash)}`);
    toast.add({
      severity: 'success',
      summary: 'System forgotten',
      detail: `Discovery can create "${instance.title}" again.`,
      life: 3000,
    });
    instances.retry();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Forget failed',
      detail: await getErrorDetail(error, 'Failed to forget the system.'),
      life: 5000,
    });
  }
}
</script>

<template>
  <Panel title="Created systems" :level="2">
    <template #actions>
      <Button icon="refresh" @click="instances.retry">Refresh</Button>
    </template>
    <DataState
      :status="instances.status.value"
      subject="created systems"
      empty-title="No systems created yet"
      empty-body="When discovery finds evidence matching this template, it creates a system for each set of label values."
      icon="systems"
      @retry="instances.retry"
    >
      <DataTable
        :caption="plural(rows.length, 'created system')"
        caption-hidden
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
      >
        <template #cell-keyValues="{ row: r }">
          <Text as="span" variant="code">{{ r.keyValues }}</Text>
        </template>
        <template #cell-system="{ row: r }">
          <Cluster gap="1">
            <TextLink
              v-if="r.instance.sspId"
              :to="{
                name: 'system-configure',
                params: { systemId: r.instance.sspId },
              }"
              >{{ r.instance.title }}</TextLink
            >
            <Text v-else as="span">{{ r.instance.title }} (deleted)</Text>
            <Tag v-if="r.instance.stale" label="Stale" />
          </Cluster>
        </template>
        <template #cell-problems="{ row: r }">
          <Stack gap="1">
            <Text v-if="r.instance.lastError" as="span">{{
              r.instance.lastError
            }}</Text>
            <Text
              v-if="r.instance.skippedEntries > 0"
              as="span"
              variant="caption"
            >
              {{ plural(r.instance.skippedEntries, 'invalid value') }} skipped
            </Text>
            <Text
              v-if="!r.instance.lastError && !r.instance.skippedEntries"
              as="span"
              variant="caption"
              >None</Text
            >
          </Stack>
        </template>
        <template #actions="{ row: r }">
          <Button
            v-if="!r.instance.sspId"
            size="sm"
            :disabled-reason="
              r.instance.keyHash
                ? undefined
                : 'The API gave no key for this system, so it cannot be forgotten.'
            "
            @click="forgetting = r.instance"
            >Forget</Button
          >
        </template>
      </DataTable>
    </DataState>
    <ConfirmDialog
      v-model:open="forgetOpen"
      :title="`Forget ${forgetting?.title ?? 'this system'}?`"
      confirm-label="Forget"
      tone="primary"
      @confirm="forget"
      ><Text
        >The next discovery run creates it again if its evidence is still
        there.</Text
      ></ConfirmDialog
    >
  </Panel>
</template>
