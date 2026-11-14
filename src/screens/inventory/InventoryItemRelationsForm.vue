<script setup lang="ts">
/**
 * An inventory item's relationships in its security plan: the plan's components it implements,
 * its responsible parties (a role and its parties), properties and links, saved together with one
 * PUT. Emits `saved` (the page confirms it).
 */
import { computed, reactive, ref } from 'vue';
import type { InventoryItem, Party, Role, SystemComponent } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { getErrorDetail } from '@/utils/httpErrors';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ sspId: string; item: InventoryItem }>();
const emit = defineEmits<{ saved: [item: InventoryItem]; cancel: [] }>();

const api = useAuthenticatedInstance();

const components = useApiQuery<SystemComponent[]>(
  `/api/oscal/system-security-plans/${props.sspId}/system-implementation/components`,
);
const parties = useApiQuery<Party[]>('/api/oscal/parties');
const roles = useApiQuery<Role[]>('/api/oscal/roles');

/** Options from a list, keeping saved values the list doesn't have (shown by their ID). */
function withSaved(
  options: { value: string; label: string }[],
  saved: (string | undefined)[],
) {
  const known = new Set(options.map((o) => o.value));
  const missing = [...new Set(saved)].filter(
    (value): value is string => Boolean(value) && !known.has(value!),
  );
  return [...options, ...missing.map((value) => ({ value, label: value }))];
}

const draft = reactive({
  implementedComponents: (props.item.implementedComponents ?? []).map((c) => ({
    componentUuid: c.componentUuid ?? '',
    remarks: c.remarks ?? '',
  })),
  responsibleParties: (props.item.responsibleParties ?? []).map((p) => ({
    roleId: p.roleId ?? '',
    partyUuids: [...(p.partyUuids ?? [])],
    remarks: p.remarks ?? '',
  })),
  props: (props.item.props ?? []).map((p) => ({
    ...p,
    name: p.name ?? '',
    value: p.value ?? '',
  })),
  links: (props.item.links ?? []).map((l) => ({ ...l })),
});

const componentOptions = computed(() =>
  withSaved(
    (components.data.value ?? []).map((c) => ({
      value: c.uuid,
      label: c.title || c.uuid,
    })),
    draft.implementedComponents.map((c) => c.componentUuid),
  ),
);
const roleOptions = computed(() =>
  withSaved(
    (roles.data.value ?? []).map((r) => ({
      value: r.id,
      label: r.title || r.id,
    })),
    draft.responsibleParties.map((p) => p.roleId),
  ),
);
const partyOptions = computed(() =>
  withSaved(
    (parties.data.value ?? []).map((p) => ({
      value: p.uuid,
      label: p.name || p.shortName || p.uuid,
    })),
    draft.responsibleParties.flatMap((p) => p.partyUuids),
  ),
);

const saving = ref(false);
const saveError = ref('');

async function save() {
  saving.value = true;
  saveError.value = '';
  try {
    const response = await api.put<{ data: InventoryItem }>(
      `/api/oscal/system-security-plans/${props.sspId}/system-implementation/inventory-items/${props.item.uuid}`,
      {
        ...props.item,
        // Rows left without their main value are dropped.
        implementedComponents: draft.implementedComponents
          .filter((c) => c.componentUuid)
          .map((c) => ({ ...c, remarks: c.remarks.trim() || undefined })),
        responsibleParties: draft.responsibleParties
          .filter((p) => p.roleId)
          .map((p) => ({ ...p, remarks: p.remarks.trim() || undefined })),
        props: draft.props.filter((p) => p.name.trim()),
        links: draft.links.filter((l) => l.href.trim()),
      },
      { transformRequest: [decamelizeKeys] },
    );
    emit('saved', response.data.data);
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
        v-model="draft.implementedComponents"
        legend="Implemented components"
        hint="The plan's components this item implements."
        item-label="component"
        add-label="Add component"
        empty-text="Not attached to any component."
        :new-item="() => ({ componentUuid: '', remarks: '' })"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="Component">
              <Select
                v-model="item.componentUuid"
                :options="componentOptions"
                placeholder="Choose a component"
              />
            </FormField>
            <FormField label="Remarks"
              ><TextInput v-model="item.remarks"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
      <FieldList
        v-model="draft.responsibleParties"
        legend="Responsible parties"
        item-label="responsibility"
        add-label="Add responsibility"
        empty-text="No responsible parties."
        :new-item="() => ({ roleId: '', partyUuids: [], remarks: '' })"
      >
        <template #item="{ item }">
          <Stack gap="3">
            <FormField label="Role">
              <Select
                v-model="item.roleId"
                :options="roleOptions"
                placeholder="Choose a role"
              />
            </FormField>
            <CheckboxGroup
              v-model="item.partyUuids"
              legend="Parties"
              :options="partyOptions"
            />
            <FormField label="Remarks"
              ><TextInput v-model="item.remarks"
            /></FormField>
          </Stack>
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
      <FieldList
        v-model="draft.links"
        legend="Links"
        item-label="link"
        add-label="Add link"
        empty-text="No links."
        :new-item="() => ({ href: '', rel: '', text: '' })"
      >
        <template #item="{ item }">
          <Grid min="sm" gap="2">
            <FormField label="URL"
              ><TextInput v-model="item.href" type="url"
            /></FormField>
            <FormField label="Relation"
              ><TextInput v-model="item.rel"
            /></FormField>
            <FormField label="Text"
              ><TextInput v-model="item.text"
            /></FormField>
          </Grid>
        </template>
      </FieldList>
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
