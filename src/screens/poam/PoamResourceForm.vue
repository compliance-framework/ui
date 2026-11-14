<script setup lang="ts">
/**
 * Add or edit a POA&M back matter resource: title, description, remarks, citation, document IDs,
 * links and properties. Editing keeps its other fields (such as an embedded file). Emits `saved`.
 */
import { reactive, ref } from 'vue';
import type { BackMatterResource } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { uuid } from '@/utils/uuid';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{
  poamId: string;
  resource?: BackMatterResource | null;
}>();
const emit = defineEmits<{
  saved: [resource: BackMatterResource];
  cancel: [];
}>();

const api = useAuthenticatedInstance();
const base = `/api/oscal/plan-of-action-and-milestones/${props.poamId}/back-matter/resources`;

const r = props.resource ?? undefined;
const draft = reactive({
  title: r?.title ?? '',
  description: r?.description ?? '',
  remarks: r?.remarks ?? '',
  citation: r?.citation?.text ?? '',
  documentIds: (r?.documentIds ?? []).map((d) => ({
    scheme: d.scheme ?? '',
    identifier: d.identifier ?? '',
  })),
  links: (r?.rlinks ?? []).map((l) => ({
    href: l.href,
    mediaType: l.mediaType ?? '',
  })),
  props: (r?.props ?? []).map((p) => ({
    name: p.name ?? '',
    value: p.value ?? '',
  })),
});
const titleError = ref('');
const saving = ref(false);
const saveError = ref('');

async function save() {
  titleError.value = draft.title.trim() ? '' : 'Enter a title.';
  if (titleError.value) return;
  saving.value = true;
  saveError.value = '';
  const documentIds = draft.documentIds
    .filter((d) => d.identifier.trim())
    .map((d) => ({
      identifier: d.identifier.trim(),
      ...(d.scheme.trim() ? { scheme: d.scheme.trim() } : {}),
    }));
  const links = draft.links
    .filter((l) => l.href.trim())
    .map((l) => ({
      href: l.href.trim(),
      ...(l.mediaType.trim() ? { mediaType: l.mediaType.trim() } : {}),
    }));
  const properties = draft.props
    .filter((p) => p.name.trim())
    .map((p) => ({ name: p.name.trim(), value: p.value.trim() }));
  const body = {
    ...(r ?? { uuid: uuid() }),
    title: draft.title.trim(),
    description: draft.description.trim() || undefined,
    remarks: draft.remarks.trim() || undefined,
    citation: draft.citation.trim()
      ? { ...(r?.citation ?? {}), text: draft.citation.trim() }
      : undefined,
    documentIds: documentIds.length ? documentIds : undefined,
    rlinks: links.length ? links : undefined,
    props: properties.length ? properties : undefined,
  } as BackMatterResource;
  try {
    const response = r
      ? await api.put<{ data: BackMatterResource }>(`${base}/${r.uuid}`, body, {
          transformRequest: [decamelizeKeys],
        })
      : await api.post<{ data: BackMatterResource }>(base, body, {
          transformRequest: [decamelizeKeys],
        });
    emit('saved', response.data.data ?? body);
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form novalidate @submit.prevent="save">
    <Stack gap="4">
      <FormField label="Title" required :error="titleError">
        <TextInput v-model="draft.title" />
      </FormField>
      <FormField label="Description"
        ><Textarea v-model="draft.description" :rows="3"
      /></FormField>
      <FormField label="Remarks"
        ><Textarea v-model="draft.remarks" :rows="2"
      /></FormField>
      <FormField label="Citation"
        ><TextInput v-model="draft.citation"
      /></FormField>
      <FieldList
        v-model="draft.documentIds"
        legend="Document IDs"
        item-label="document ID"
        add-label="Add document ID"
        empty-text="No document IDs."
        :new-item="() => ({ scheme: '', identifier: '' })"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="Identifier"
              ><TextInput v-model="item.identifier"
            /></FormField>
            <FormField label="Scheme" hint="Optional, a URI"
              ><TextInput v-model="item.scheme"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
      <FieldList
        v-model="draft.links"
        legend="Links"
        item-label="link"
        add-label="Add link"
        empty-text="No links."
        :new-item="() => ({ href: '', mediaType: '' })"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="URL"
              ><TextInput v-model="item.href" type="url"
            /></FormField>
            <FormField label="Media type" hint="e.g. application/pdf"
              ><TextInput v-model="item.mediaType"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
      <FieldList
        v-model="draft.props"
        legend="Properties"
        item-label="property"
        add-label="Add property"
        empty-text="No properties."
        :new-item="() => ({ name: '', value: '' })"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="Name"
              ><TextInput v-model="item.name"
            /></FormField>
            <FormField label="Value"
              ><TextInput v-model="item.value"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">{{
          r ? 'Save resource' : 'Add resource'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
