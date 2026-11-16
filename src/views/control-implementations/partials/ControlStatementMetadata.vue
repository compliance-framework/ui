<script setup lang="ts">
/** A statement's ID, remarks, properties and links, with Edit statement. */
import Button from '@/ds/components/Button/Button.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import type { Statement } from '@/oscal';

defineProps<{
  statement: Statement;
}>();

const emit = defineEmits<{
  edit: [];
}>();

function formatProps(props: Statement['props']): string {
  if (!props?.length) {
    return '';
  }
  return props
    .map((prop) => {
      if (prop.name && prop.value) {
        return `${prop.name}=${prop.value}`;
      }
      return prop.name || prop.value || 'Property';
    })
    .join(', ');
}

function formatLinks(links: Statement['links']): string {
  if (!links?.length) {
    return '';
  }
  return links
    .map((link) => link.text || link.href || link.rel || 'Link')
    .join(', ');
}
</script>

<template>
  <Stack gap="3">
    <DescriptionList
      :items="[
        { key: 'id', label: 'Statement ID', value: statement.statementId },
        { key: 'remarks', label: 'Remarks', value: statement.remarks },
        {
          key: 'props',
          label: 'Properties',
          value: statement.props ? formatProps(statement.props) : '',
        },
        {
          key: 'links',
          label: 'Links',
          value: statement.links ? formatLinks(statement.links) : '',
        },
      ]"
    />
    <div><Button icon="edit" @click="emit('edit')">Edit statement</Button></div>
  </Stack>
</template>
