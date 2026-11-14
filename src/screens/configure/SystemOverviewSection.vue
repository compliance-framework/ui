<script setup lang="ts">
import { computed } from 'vue';
import type { SystemCharacteristics, SystemSecurityPlan } from '@/oscal';
import { formatDate, formatDateTime } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import ProfilesField from '../implementation/ProfilesField.vue';

/**
 * Configure System → Overview: the security plan's details, the profiles it implements (saved
 * as you tick them), a count of what it contains, and a summary of its characteristics.
 */
const props = defineProps<{ sspId: string }>();
const base = `/api/oscal/system-security-plans/${props.sspId}`;

const plan = useApiQuery<SystemSecurityPlan>(base);
const characteristics = useApiQuery<SystemCharacteristics>(
  `${base}/system-characteristics`,
);
const COUNTS = [
  { key: 'users', label: 'System users', path: 'users' },
  { key: 'components', label: 'Components', path: 'components' },
  { key: 'inventory', label: 'Inventory items', path: 'inventory-items' },
  {
    key: 'leveraged',
    label: 'Leveraged authorizations',
    path: 'leveraged-authorizations',
  },
];
const countQueries = COUNTS.map((count) => ({
  ...count,
  query: useApiQuery<unknown[]>(`${base}/system-implementation/${count.path}`),
}));

const details = computed(() => {
  const p = plan.data.value;
  if (!p) return [];
  const m = p.metadata;
  return [
    { key: 'title', label: 'Title', value: m.title },
    { key: 'version', label: 'Version', value: m.version },
    {
      key: 'modified',
      label: 'Last modified',
      value: m.lastModified ? formatDateTime(m.lastModified) : '',
    },
    {
      key: 'published',
      label: 'Published',
      value: m.published ? formatDateTime(m.published) : '',
    },
    { key: 'uuid', label: 'UUID', value: p.uuid },
    { key: 'remarks', label: 'Remarks', value: m.remarks },
  ];
});
const counts = computed(() =>
  countQueries.map((count) => ({
    key: count.key,
    label: count.label,
    value: count.query.data.value?.length ?? 0,
  })),
);
const summary = computed(() => {
  const c = characteristics.data.value;
  if (!c) return [];
  return [
    { key: 'name', label: 'System name', value: c.systemName },
    { key: 'short', label: 'Short name', value: c.systemNameShort },
    {
      key: 'sensitivity',
      label: 'Security sensitivity level',
      value: c.securitySensitivityLevel,
    },
    {
      key: 'authorized',
      label: 'Date authorized',
      value: c.dateAuthorized ? formatDate(String(c.dateAuthorized)) : '',
    },
    { key: 'description', label: 'Description', value: c.description },
  ];
});
</script>

<template>
  <DataState
    :status="plan.status.value"
    subject="this security plan"
    skeleton="panel"
    @retry="plan.retry"
  >
    <Stack gap="5">
      <Panel title="Details" :level="2">
        <DescriptionList :items="details" />
      </Panel>
      <Panel
        title="Profiles"
        description="The profiles this system implements decide its controls on Implementation and Compliance."
        :level="2"
      >
        <ProfilesField :ssp-id="sspId" />
      </Panel>
      <Panel title="Contents" :level="2">
        <DescriptionList :items="counts" />
      </Panel>
      <Panel v-if="summary.length" title="Characteristics" :level="2">
        <DescriptionList :items="summary" />
      </Panel>
    </Stack>
  </DataState>
</template>
