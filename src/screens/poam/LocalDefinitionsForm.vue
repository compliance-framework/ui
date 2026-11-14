<script setup lang="ts">
/**
 * Edit a POA&M's local definitions: components, inventory items and assessment components
 * defined in the plan itself, and remarks. Saved together (the API takes a PUT for both adding and
 * editing). Rows left empty are dropped. Emits `saved`.
 */
import { reactive, ref } from 'vue';
import type {
  InventoryItem,
  POAMLocalDefinitions,
  SystemComponent,
} from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { DEFINED_COMPONENT_TYPE_OPTIONS } from '@/types/subject-templates';
import { uuid } from '@/utils/uuid';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{
  poamId: string;
  localDefinitions?: POAMLocalDefinitions;
}>();
const emit = defineEmits<{
  saved: [definitions: POAMLocalDefinitions];
  cancel: [];
}>();

const api = useAuthenticatedInstance();
const typeOptions = DEFINED_COMPONENT_TYPE_OPTIONS.map((o) => o.value);
const STATUSES = [
  { value: 'operational', label: 'Operational' },
  { value: 'under-development', label: 'Under development' },
  { value: 'under-major-modification', label: 'Under major modification' },
  { value: 'disposition', label: 'Disposition' },
  { value: 'other', label: 'Other' },
];

const copyComponent = (c: SystemComponent): SystemComponent => ({
  ...c,
  status: { ...(c.status ?? {}), state: c.status?.state || 'operational' },
});
const newComponent = (): SystemComponent =>
  ({
    uuid: uuid(),
    title: '',
    type: '',
    description: '',
    status: { state: 'operational', remarks: '' },
    remarks: '',
  }) as SystemComponent;

const newItem = (): InventoryItem =>
  ({ uuid: uuid(), description: '', remarks: '' }) as InventoryItem;

const ld = props.localDefinitions;
const draft = reactive({
  components: (ld?.components ?? []).map(copyComponent),
  inventoryItems: (ld?.inventoryItems ?? []).map((i): InventoryItem => ({
    ...i,
  })),
  assets: (ld?.assessmentAssets?.components ?? []).map(copyComponent),
  remarks: ld?.remarks ?? '',
});
const saving = ref(false);
const saveError = ref('');

async function save() {
  saving.value = true;
  saveError.value = '';
  const body: POAMLocalDefinitions = {
    ...(ld ?? {}),
    components: draft.components.filter((c) => c.title?.trim()),
    inventoryItems: draft.inventoryItems.filter((i) => i.description?.trim()),
    assessmentAssets: {
      ...(ld?.assessmentAssets ?? { assessmentPlatforms: [] }),
      components: draft.assets.filter((c) => c.title?.trim()),
    },
    remarks: draft.remarks.trim() || undefined,
  };
  try {
    const response = await api.put<{ data: POAMLocalDefinitions }>(
      `/api/oscal/plan-of-action-and-milestones/${props.poamId}/local-definitions`,
      body,
      { transformRequest: [decamelizeKeys] },
    );
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
    <Stack gap="5">
      <FieldList
        v-model="draft.components"
        legend="Components"
        item-label="component"
        add-label="Add component"
        empty-text="No local components."
        :new-item="newComponent"
      >
        <template #item="{ item }">
          <Stack gap="2">
            <Grid min="sm" gap="2">
              <FormField label="Title"
                ><TextInput v-model="item.title"
              /></FormField>
              <FormField label="Type"
                ><TextInput v-model="item.type" :options="typeOptions"
              /></FormField>
              <FormField label="Status"
                ><Select v-model="item.status.state" :options="STATUSES"
              /></FormField>
            </Grid>
            <FormField label="Description"
              ><Textarea v-model="item.description" :rows="2"
            /></FormField>
          </Stack>
        </template>
      </FieldList>
      <FieldList
        v-model="draft.inventoryItems"
        legend="Inventory items"
        item-label="inventory item"
        add-label="Add inventory item"
        empty-text="No local inventory items."
        :new-item="newItem"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="Description"
              ><TextInput v-model="item.description"
            /></FormField>
            <FormField label="Remarks"
              ><TextInput v-model="item.remarks"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
      <FieldList
        v-model="draft.assets"
        legend="Assessment components"
        item-label="assessment component"
        add-label="Add assessment component"
        empty-text="No assessment components."
        :new-item="newComponent"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="Title"
              ><TextInput v-model="item.title"
            /></FormField>
            <FormField label="Type"
              ><TextInput v-model="item.type" :options="typeOptions"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
      <FormField label="Remarks"
        ><Textarea v-model="draft.remarks" :rows="2"
      /></FormField>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">Save</Button>
      </Cluster>
    </Stack>
  </form>
</template>
