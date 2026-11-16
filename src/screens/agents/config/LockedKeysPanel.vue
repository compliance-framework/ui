<script setup lang="ts">
// R71 "forbidden" state: api.*, daemon and remote_config.* are locked and never editable; they
// can only change on the agent host (file, environment or CLI, R30). The panel's title and
// description say so once for every key in it.
import { computed } from 'vue';
import type { ConfigDoc } from '@/types/agent-config';
import { FORBIDDEN_TOOLTIP } from '@/utils/agent-config/field-access';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';

const props = defineProps<{ doc: ConfigDoc | null }>();

// api.auth.client_secret is never shown (only client_id).
const rows = computed(() => {
  const d = props.doc ?? {};
  const rc = d.remote_config ?? {};
  const show = (v: unknown, fallback = '—') =>
    v === undefined || v === null || v === '' ? fallback : String(v);
  return [
    { key: 'api.url', value: show(d.api?.url) },
    { key: 'api.auth.client_id', value: show(d.api?.auth?.client_id) },
    { key: 'daemon', value: show(d.daemon) },
    // R29: an unset mode is report with API credentials, off without.
    {
      key: 'remote_config.mode',
      value: show(rc.mode, d.api?.auth?.client_id ? 'report' : 'off'),
    },
    {
      key: 'remote_config.poll_interval',
      value: show(rc.poll_interval, '60s'),
    },
    { key: 'remote_config.trusted_sources', value: rc.trusted_sources ?? [] },
    {
      key: 'remote_config.overridable_config_flags',
      value: rc.overridable_config_flags ?? [],
    },
    {
      key: 'remote_config.allow_local_sources',
      value: show(rc.allow_local_sources, 'false'),
    },
  ];
});
const items = computed(() =>
  rows.value.map((row) => ({
    key: row.key,
    label: row.key,
    value: Array.isArray(row.value) ? undefined : row.value,
  })),
);
const lists = computed(() =>
  rows.value.filter((row): row is { key: string; value: string[] } =>
    Array.isArray(row.value),
  ),
);
</script>

<template>
  <Panel
    title="Set on the agent host"
    :description="`${FORBIDDEN_TOOLTIP}.`"
    dense
    data-test="locked-keys"
  >
    <DescriptionList :items="items">
      <template v-for="list in lists" :key="list.key" #[`value-${list.key}`]>
        <Text v-if="!list.value.length" as="span" variant="secondary"
          >None</Text
        >
        <Cluster v-else gap="1">
          <Tag v-for="v in list.value" :key="v" :label="v" />
        </Cluster>
      </template>
    </DescriptionList>
  </Panel>
</template>
