<script setup lang="ts">
import { computed, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useAuthenticatedInstance } from '@/composables/axios';
import { formatLocalDateTime } from '@/ds/format';
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Tabs from '@/ds/components/Tabs/Tabs.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { viewQuery, readView } from '../evidenceView';
import {
  expiry,
  linkedMedia,
  provideEvidenceRecord,
  useEvidenceLoader,
} from './evidenceRecord';

/**
 * An evidence record, with the classic record page's tabs as routes, so each tab has its own
 * shareable URL. It opens inside a system (/systems/:systemId/evidence/:evidenceId/...) from This
 * System > Evidence, or on its own (/evidence/:evidenceId/...) from global pages. The header
 * carries the status, signature and key facts; the list's search travels in the query so
 * "Evidence" in the breadcrumb returns to the same view.
 */
const route = useRoute();
const api = useAuthenticatedInstance();

const systemId = computed(() =>
  typeof route.params.systemId === 'string' ? route.params.systemId : undefined,
);
const evidenceId = computed(() => String(route.params.evidenceId));
/** Tab route names: `<prefix>`, `<prefix>-metadata`, … (see evidenceRecordTabs). */
const prefix = computed(() =>
  systemId.value ? 'system-evidence-record' : 'evidence:view',
);
function link(tab = '', id = evidenceId.value) {
  return {
    name: tab ? `${prefix.value}-${tab}` : prefix.value,
    params: {
      ...(systemId.value ? { systemId: systemId.value } : {}),
      evidenceId: id,
    },
    query: listQuery.value,
  };
}
const record = useEvidenceLoader(api, () => evidenceId.value, link);
provideEvidenceRecord(record);
watch(evidenceId, () => void record.reload(), { immediate: true });

const evidence = computed(() => record.evidence.value);
/** The list view the user came from, kept on every link within the record. */
const listQuery = computed(() => viewQuery(readView(route.query)));

const crumbs = computed(() => [
  {
    label: 'Evidence',
    to: systemId.value
      ? {
          name: 'system-evidence',
          params: { systemId: systemId.value },
          query: listQuery.value,
        }
      : { name: 'evidence:index', query: listQuery.value },
  },
]);

const tabs = computed(() =>
  [
    { label: 'Overview', tab: '' },
    { label: 'Metadata', tab: 'metadata' },
    { label: 'Risks', tab: 'risks' },
    { label: 'Media', tab: 'media' },
    { label: 'Signature', tab: 'signature' },
    { label: 'History', tab: 'history' },
  ].map(({ label, tab }) => ({ label, to: link(tab) })),
);

const state = computed(() => {
  const value = evidence.value?.status?.state?.toLowerCase();
  return value === 'satisfied' || value === 'not-satisfied' ? value : 'unknown';
});
const signatureLabel = computed(() => {
  const signature = record.signature.value;
  if (signature === undefined) return 'Checking signature';
  if (signature === null) return 'Signature unavailable';
  return signature.status === 'signed' ? 'Signed' : 'Unsigned';
});

const facts = computed(() => {
  const item = evidence.value;
  if (!item) return [];
  const media = linkedMedia(item.links, item.backMatter?.resources).length;
  const expires = expiry(item.expires);
  return [
    {
      key: 'collected',
      label: 'Collected',
      value: formatLocalDateTime(item.end),
    },
    {
      key: 'expires',
      label: record.latestId.value ? 'Latest evidence' : 'Expires',
      value:
        expires === 'none'
          ? 'No expiry'
          : `${formatLocalDateTime(item.expires!)}${expires === 'expired' ? ' (expired)' : expires === 'soon' ? ' (within a week)' : ''}`,
    },
    {
      key: 'summary',
      label: 'Contains',
      value: `${item.labels.length} labels, ${item.props?.length ?? 0} props, ${item.links?.length ?? 0} links, ${media} media`,
    },
  ];
});

const executionId = computed(
  () =>
    evidence.value?.labels.find((l) => l.name === 'workflow.execution.id')
      ?.value,
);
</script>

<template>
  <Stack gap="6">
    <Breadcrumbs :crumbs="crumbs" />

    <template v-if="record.status.value === 'missing'">
      <PageHeader title="Evidence not found" />
      <DataState
        status="empty"
        subject="evidence"
        empty-title="We couldn't find this evidence"
        empty-body="It may have been removed, you may not have access to it, or the link may be incomplete."
        icon="evidence"
      >
        <template #empty-actions>
          <TextLink :to="crumbs[0]!.to">Back to evidence</TextLink>
        </template>
      </DataState>
    </template>

    <template v-else-if="record.status.value !== 'ready' || !evidence">
      <PageHeader title="Evidence" />
      <DataState
        :status="
          record.status.value === 'ready' ? 'loading' : record.status.value
        "
        subject="this evidence"
        skeleton="panel"
        @retry="record.reload"
      />
    </template>

    <template v-else>
      <PageHeader :title="evidence.title || 'Untitled evidence'">
        <template #status>
          <StatusBadge :status="state" />
          <Tag :label="signatureLabel" />
        </template>
        <template #facts>
          <DescriptionList :items="facts" layout="inline">
            <template v-if="record.latestId.value" #value-expires>
              <TextLink :to="link('', record.latestId.value)"
                >Go to the latest evidence</TextLink
              >
            </template>
          </DescriptionList>
        </template>
        <template #actions>
          <Button
            v-if="executionId"
            :to="{
              name: 'workflow-execution-view',
              params: { id: executionId },
            }"
            >Back to execution</Button
          >
          <Button
            icon="refresh"
            :to="{ name: 'evidence:update', params: { id: evidence.id } }"
            >Re-submit</Button
          >
        </template>
      </PageHeader>

      <Tabs :label="`${evidence.title}: sections`" :tabs="tabs">
        <RouterView />
      </Tabs>
    </template>
  </Stack>
</template>
