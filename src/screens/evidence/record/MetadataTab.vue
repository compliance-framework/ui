<script setup lang="ts">
import { computed } from 'vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import { useEvidenceRecord } from './evidenceRecord';

/**
 * Metadata: every label (system labels such as `_policy` included, as on the classic page), the
 * props and the links, exactly as recorded.
 */
const { evidence } = useEvidenceRecord();
const item = computed(() => evidence.value!);

const props = computed(() =>
  (item.value.props ?? []).map((prop, index) => ({
    id: `${prop.name}-${index}`,
    name: prop.name,
    value: prop.value,
    class: prop.class ?? '',
    ns: prop.ns ?? '',
  })),
);
const links = computed(() =>
  (item.value.links ?? []).map((link, index) => ({
    id: `${link.href}-${index}`,
    href: link.href,
    rel: link.rel ?? '',
    text: link.text ?? '',
  })),
);
</script>

<template>
  <Stack gap="6">
    <Panel title="Labels">
      <Cluster v-if="item.labels.length" gap="1">
        <Tag
          v-for="label in item.labels"
          :key="`${label.name}=${label.value}`"
          :label="`${label.name}=${label.value}`"
        />
      </Cluster>
      <Text v-else variant="secondary">This evidence has no labels.</Text>
    </Panel>

    <Panel title="Props">
      <DataTable
        v-if="props.length"
        caption="Props recorded with this evidence"
        caption-hidden
        :columns="[
          { key: 'name', label: 'Name' },
          { key: 'value', label: 'Value', minWidth: 'md' },
          { key: 'class', label: 'Class' },
          { key: 'ns', label: 'Namespace' },
        ]"
        :rows="props"
        :row-key="(r) => r.id"
      />
      <Text v-else variant="secondary">This evidence has no props.</Text>
    </Panel>

    <Panel title="Links">
      <DataTable
        v-if="links.length"
        caption="Links recorded with this evidence"
        caption-hidden
        :columns="[
          { key: 'href', label: 'Link', minWidth: 'md' },
          { key: 'rel', label: 'Relation' },
          { key: 'text', label: 'Text' },
        ]"
        :rows="links"
        :row-key="(r) => r.id"
      />
      <Text v-else variant="secondary">This evidence has no links.</Text>
    </Panel>
  </Stack>
</template>
