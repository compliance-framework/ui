<script setup lang="ts">
/**
 * Add a back matter resource to a component definition: title, description, remarks, citation,
 * links. The API's POST replaces the whole back matter, so the existing resources go with it.
 */
import { reactive, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import { v4 as uuidv4 } from 'uuid';
import type { BackMatterResource } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
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
  componentDefinitionId: string;
  existing: BackMatterResource[];
}>();
const emit = defineEmits<{
  created: [resource: BackMatterResource];
  cancel: [];
}>();

const toast = useToast();
const api = useAuthenticatedInstance();

const draft = reactive({
  title: '',
  description: '',
  remarks: '',
  citation: '',
  links: [] as { href: string; mediaType: string }[],
});
const errors = reactive({ title: '', description: '' });
const saving = ref(false);
const saveError = ref('');

async function save() {
  errors.title = draft.title.trim() ? '' : 'Enter a title.';
  errors.description = draft.description.trim() ? '' : 'Enter a description.';
  if (errors.title || errors.description) return;
  saving.value = true;
  saveError.value = '';
  const links = draft.links
    .filter((link) => link.href.trim())
    .map((link) => ({
      href: link.href.trim(),
      ...(link.mediaType.trim() ? { mediaType: link.mediaType.trim() } : {}),
    }));
  const body: BackMatterResource = {
    uuid: uuidv4(),
    title: draft.title.trim(),
    description: draft.description.trim(),
    ...(draft.remarks.trim() ? { remarks: draft.remarks.trim() } : {}),
    ...(draft.citation.trim()
      ? { citation: { text: draft.citation.trim() } }
      : {}),
    ...(links.length ? { rlinks: links } : {}),
  };
  try {
    await api.post(
      `/api/oscal/component-definitions/${props.componentDefinitionId}/back-matter`,
      { resources: [...props.existing, body] },
      { transformRequest: [decamelizeKeys] },
    );
    toast.add({ severity: 'success', summary: 'Resource added', life: 3000 });
    emit('created', body);
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
      <FormField label="Title" required :error="errors.title">
        <TextInput v-model="draft.title" />
      </FormField>
      <FormField label="Description" required :error="errors.description">
        <Textarea v-model="draft.description" :rows="3" />
      </FormField>
      <FormField label="Remarks"
        ><Textarea v-model="draft.remarks" :rows="2"
      /></FormField>
      <FormField label="Citation"
        ><TextInput v-model="draft.citation"
      /></FormField>
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
      <InlineMessage v-if="saveError" tone="error" title="Not added">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving"
          >Add resource</Button
        >
      </Cluster>
    </Stack>
  </form>
</template>
