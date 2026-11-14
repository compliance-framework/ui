<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import decamelizeKeys from 'decamelize-keys';
import { useApiQuery } from '@/ds/query';
import CodeBlock from '@/ds/components/CodeBlock/CodeBlock.vue';
import DataState from '@/ds/components/DataState/DataState.vue';

/**
 * The JSON tab of an OSCAL record page (and Configure System's JSON section): the whole document as OSCAL JSON (kebab-case keys), to
 * read, copy or download (the code block does both). One tab serves every document type; the route picks the endpoint.
 */
// Record frames pass their own props to every tab (e.g. assessment results); this tab doesn't use them.
defineOptions({ inheritAttrs: false });

const SOURCES: Record<string, { endpoint: string; noun: string }> = {
  'profile:view-json': { endpoint: '/api/oscal/profiles', noun: 'profile' },
  'component-definition-json': {
    endpoint: '/api/oscal/component-definitions',
    noun: 'component-definition',
  },
  'assessment-plan-json': {
    endpoint: '/api/oscal/assessment-plans',
    noun: 'assessment-plan',
  },
  'assessment-results-json': {
    endpoint: '/api/oscal/assessment-results',
    noun: 'assessment-results',
  },
  // Configure System's JSON section (the route is /systems/:systemId/configure/json).
  'system-configure-json': {
    endpoint: '/api/oscal/system-security-plans',
    noun: 'ssp',
  },
  'plan-of-action-and-milestones-json': {
    endpoint: '/api/oscal/plan-of-action-and-milestones',
    noun: 'poam',
  },
};

const route = useRoute();
const source = SOURCES[String(route.name)]!;
const id = String(route.params.id ?? route.params.systemId);
const doc = useApiQuery<Record<string, unknown>>(
  `${source.endpoint}/${id}/full`,
);

// Responses arrive camelCased; OSCAL's own format is kebab-case.
const json = computed(() =>
  doc.data.value
    ? JSON.stringify(
        decamelizeKeys(doc.data.value, { separator: '-', deep: true }),
        null,
        2,
      )
    : '',
);
const fileName = computed(() => {
  const title = (doc.data.value?.metadata as { title?: string } | undefined)
    ?.title;
  return `${(title ?? id).replace(/[^a-zA-Z0-9]/g, '_')}-${source.noun}.json`;
});
</script>

<template>
  <DataState
    :status="doc.status.value"
    subject="this document"
    skeleton="panel"
    @retry="doc.retry"
  >
    <CodeBlock :code="json" label="OSCAL JSON" :file-name="fileName" />
  </DataState>
</template>
