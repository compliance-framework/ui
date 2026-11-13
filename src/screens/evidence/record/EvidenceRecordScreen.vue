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
 * An evidence record inside This System (/next/systems/:systemId/evidence/:evidenceId/...), with
 * the classic record page's tabs as routes, so each tab has its own shareable URL. The header
 * carries the status, signature and key facts; the list's search travels in the query so
 * "Evidence" in the breadcrumb returns to the same view.
 */
const route = useRoute();
const api = useAuthenticatedInstance();

const systemId = computed(() => String(route.params.systemId));
const evidenceId = computed(() => String(route.params.evidenceId));
const record = useEvidenceLoader(api, () => evidenceId.value);
provideEvidenceRecord(record);
watch(evidenceId, () => void record.reload(), { immediate: true });

const evidence = computed(() => record.evidence.value);
/** The list view the user came from, kept on every link within the record. */
const listQuery = computed(() => viewQuery(readView(route.query)));

const crumbs = computed(() => [
  {
    label: 'Evidence',
    to: {
      name: 'ds-system-evidence',
      params: { systemId: systemId.value },
      query: listQuery.value,
    },
  },
]);

const tabs = computed(() =>
  [
    { label: 'Overview', name: 'ds-evidence-overview' },
    { label: 'Metadata', name: 'ds-evidence-metadata' },
    { label: 'Risks', name: 'ds-evidence-risks' },
    { label: 'Media', name: 'ds-evidence-media' },
    { label: 'Signature', name: 'ds-evidence-signature' },
    { label: 'History', name: 'ds-evidence-history' },
  ].map((tab) => ({
    label: tab.label,
    to: {
      name: tab.name,
      params: { systemId: systemId.value, evidenceId: evidenceId.value },
      query: listQuery.value,
    },
  })),
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
              <TextLink
                :to="{
                  name: 'ds-evidence-overview',
                  params: { systemId, evidenceId: record.latestId.value },
                  query: listQuery,
                }"
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
          <Button
            icon="external"
            :to="{
              name: 'evidence:view',
              params: { id: evidence.id },
              query: { ...listQuery, from: 'system' },
            }"
            >Open classic view</Button
          >
        </template>
      </PageHeader>

      <Tabs :label="`${evidence.title}: sections`" :tabs="tabs">
        <RouterView />
      </Tabs>
    </template>
  </Stack>
</template>
