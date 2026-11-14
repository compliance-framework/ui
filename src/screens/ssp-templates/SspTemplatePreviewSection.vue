<script setup lang="ts">
/**
 * What discovery would do now with a saved system template, without writing anything: the
 * systems it would create (or that exist), the label entries each would learn or skip, groups
 * below the minimum streams and invalid key values. Preview runs on demand.
 */
import { computed, ref } from 'vue';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import {
  formatKeyValues,
  formatLabels,
  SSP_TEMPLATE_PREVIEW_STOP_PATHS,
  toSspTemplateRequest,
  type SspTemplate,
  type SspTemplatePreview,
} from '@/types/ssp-templates';
import { getErrorDetail } from '@/utils/httpErrors';
import { plural } from '@/ds/format';
import Button from '@/ds/components/Button/Button.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ template: SspTemplate }>();
const api = useAuthenticatedInstance();

const preview = ref<SspTemplatePreview>();
const running = ref(false);
const error = ref('');

const created = computed(
  () => preview.value?.ssps?.filter((ssp) => !ssp.exists).length ?? 0,
);
const summary = computed(() => {
  const p = preview.value;
  if (!p) return '';
  const existing = (p.ssps?.length ?? 0) - created.value;
  return `${plural(created.value, 'system')} to create, ${existing} already created. ${plural(
    p.missingKeys ?? 0,
    'matching stream',
  )} lack a key label.`;
});

async function run() {
  running.value = true;
  error.value = '';
  try {
    const response = await api.post<{ data: SspTemplatePreview }>(
      '/api/admin/ssp-templates/preview',
      toSspTemplateRequest(props.template),
      {
        transformRequest: [decamelizeKeys],
        camelcaseStopPaths: [...SSP_TEMPLATE_PREVIEW_STOP_PATHS],
      },
    );
    preview.value = response.data.data;
  } catch (err) {
    preview.value = undefined;
    error.value = await getErrorDetail(err, 'Failed to preview the template.');
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <Panel
    title="Preview"
    description="What discovery would do now with the saved template. Nothing is written."
    :level="2"
  >
    <template #actions>
      <Button icon="refresh" :loading="running" @click="run">Preview</Button>
    </template>
    <InlineMessage v-if="error" tone="error" title="Preview failed">
      <p>{{ error }}</p>
    </InlineMessage>
    <Stack v-else-if="preview" gap="4">
      <Text>{{ summary }}</Text>
      <Panel
        v-for="ssp in preview.ssps ?? []"
        :key="formatKeyValues(ssp.keyValues)"
        :title="ssp.title"
        :description="`${formatKeyValues(ssp.keyValues)} · ${plural(ssp.streams, 'stream')}`"
        :level="3"
      >
        <Stack gap="2">
          <Cluster><Tag :label="ssp.exists ? 'Exists' : 'New'" /></Cluster>
          <Stack
            v-if="ssp.learn?.length || ssp.skippedByException?.length"
            gap="1"
            as="ul"
          >
            <li
              v-for="(entry, index) in ssp.learn ?? []"
              :key="`learn-${index}`"
            >
              <Text as="span">Learn: </Text
              ><Text as="code" variant="code">{{ formatLabels(entry) }}</Text>
            </li>
            <li
              v-for="(entry, index) in ssp.skippedByException ?? []"
              :key="`skip-${index}`"
            >
              <Text as="span">Skipped by exception: </Text
              ><Text as="code" variant="code">{{ formatLabels(entry) }}</Text>
            </li>
          </Stack>
        </Stack>
      </Panel>
      <Stack v-if="preview.belowThreshold?.length" gap="1">
        <Text variant="label">Below the minimum streams</Text>
        <Stack gap="1" as="ul">
          <li
            v-for="group in preview.belowThreshold"
            :key="formatKeyValues(group.keyValues)"
          >
            <Text as="span"
              >{{ formatKeyValues(group.keyValues) }}:
              {{ plural(group.streams, 'stream') }}</Text
            >
          </li>
        </Stack>
      </Stack>
      <Stack v-if="preview.invalid?.length" gap="1">
        <Text variant="label">Invalid key values</Text>
        <Stack gap="1" as="ul">
          <li
            v-for="group in preview.invalid"
            :key="formatKeyValues(group.keyValues)"
          >
            <Text as="span"
              >{{ formatKeyValues(group.keyValues) }}: {{ group.reason }}</Text
            >
          </li>
        </Stack>
      </Stack>
    </Stack>
    <Text v-else variant="secondary"
      >Run a preview to see what discovery would do.</Text
    >
  </Panel>
</template>
