<script setup lang="ts">
/**
 * A subject template (/admin/subject-templates/:id): how subjects of one kind are recognised and
 * described. Its details, text templates, identity and selector labels, label schema, props and
 * links, with Edit (which opens the template's form on the list).
 */
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  getDefinedComponentTypeLabel,
  getSubjectTemplateSourceModeLabel,
  getSubjectTemplateTypeLabel,
  type SubjectTemplate,
} from '@/types/subject-templates';
import { formatDate, plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DataTable from '@/ds/components/DataTable/DataTable.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import RecordTemplate from '@/ds/templates/RecordTemplate/RecordTemplate.vue';

const route = useRoute();
const id = String(route.params.id);
const query = useApiQuery<SubjectTemplate>(
  `/api/admin/subject-templates/${id}`,
);
const template = computed(() => query.data.value);

const details = computed(() => [
  {
    key: 'type',
    label: 'Type',
    value: getSubjectTemplateTypeLabel(template.value?.type),
  },
  {
    key: 'source',
    label: 'Source mode',
    value: getSubjectTemplateSourceModeLabel(template.value?.sourceMode),
  },
  {
    key: 'priority',
    label: 'Display priority',
    value: String(template.value?.displayPriority ?? 0),
  },
  {
    key: 'component',
    label: 'Component type',
    value: getDefinedComponentTypeLabel(template.value?.componentType),
  },
  {
    key: 'updated',
    label: 'Last updated',
    value: (() => {
      const at = template.value?.updatedAt || template.value?.createdAt;
      return at ? formatDate(at) : '';
    })(),
  },
]);

const texts = computed(() => [
  { key: 'title', label: 'Title', value: template.value?.titleTemplate },
  {
    key: 'description',
    label: 'Description',
    value: template.value?.descriptionTemplate,
  },
  { key: 'purpose', label: 'Purpose', value: template.value?.purposeTemplate },
  { key: 'remarks', label: 'Remarks', value: template.value?.remarksTemplate },
]);

const schemaRows = computed(() =>
  (template.value?.labelSchema ?? []).map((field, index) => ({
    id: `${field.key}-${index}`,
    key: field.key,
    description: field.description || 'Not set',
  })),
);
</script>

<template>
  <Stack gap="6">
    <Breadcrumbs
      :crumbs="[
        { label: 'Subject templates', to: { name: 'admin-subject-templates' } },
      ]"
    />
    <DataState
      v-if="!template"
      :status="query.status.value === 'ready' ? 'error' : query.status.value"
      subject="this subject template"
      skeleton="panel"
      @retry="query.retry"
    />
    <RecordTemplate v-else :title="template.name || 'Subject template'">
      <template #actions>
        <Button
          icon="edit"
          :to="{ name: 'admin-subject-templates', query: { edit: id } }"
          >Edit</Button
        >
      </template>
      <Stack gap="5">
        <Panel title="Details" :level="2">
          <DescriptionList :items="details" />
        </Panel>
        <Panel
          title="Text templates"
          description="How a subject's title, description, purpose and remarks are written from its labels."
          :level="2"
        >
          <DescriptionList :items="texts" layout="stacked" />
        </Panel>
        <Grid min="sm" gap="4">
          <Panel title="Identity label keys" :level="2">
            <Cluster v-if="template.identityLabelKeys?.length" gap="1">
              <Tag
                v-for="key in template.identityLabelKeys"
                :key="key"
                :label="key"
              />
            </Cluster>
            <Text v-else variant="secondary">None.</Text>
          </Panel>
          <Panel title="Selector labels" :level="2">
            <Cluster v-if="template.selectorLabels?.length" gap="1">
              <Tag
                v-for="(label, index) in template.selectorLabels"
                :key="`${label.key}-${index}`"
                :label="`${label.key}: ${label.value}`"
              />
            </Cluster>
            <Text v-else variant="secondary">None.</Text>
          </Panel>
        </Grid>
        <Panel title="Label schema" :level="2">
          <DataTable
            v-if="schemaRows.length"
            :caption="plural(schemaRows.length, 'label')"
            caption-hidden
            :columns="[
              { key: 'key', label: 'Key', minWidth: 'sm' },
              { key: 'description', label: 'Description' },
            ]"
            :rows="schemaRows"
            :row-key="(r) => r.id"
          />
          <Text v-else variant="secondary">No label schema.</Text>
        </Panel>
        <Grid min="sm" gap="4">
          <Panel title="Props" :level="2">
            <Stack v-if="template.props?.length" gap="2" as="ul">
              <li
                v-for="(prop, index) in template.props"
                :key="prop.uuid || index"
              >
                <Text as="span">{{ prop.name }}: {{ prop.value }}</Text>
                <Text
                  v-if="prop.class || prop.ns || prop.remarks"
                  variant="caption"
                  >{{
                    [
                      prop.class && `class ${prop.class}`,
                      prop.ns && `ns ${prop.ns}`,
                      prop.remarks,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  }}</Text
                >
              </li>
            </Stack>
            <Text v-else variant="secondary">None.</Text>
          </Panel>
          <Panel title="Links" :level="2">
            <Stack v-if="template.links?.length" gap="2" as="ul">
              <li v-for="(link, index) in template.links" :key="index">
                <TextLink :href="link.href">{{
                  link.text || link.href
                }}</TextLink>
                <Text v-if="link.rel" variant="caption">{{ link.rel }}</Text>
              </li>
            </Stack>
            <Text v-else variant="secondary">None.</Text>
          </Panel>
        </Grid>
      </Stack>
    </RecordTemplate>
  </Stack>
</template>
