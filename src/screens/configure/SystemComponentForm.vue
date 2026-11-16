<script setup lang="ts">
/**
 * Add or edit a component of a security plan: type, title, description, purpose, status,
 * remarks and protocols (each with port ranges). When adding, it can start from a component
 * definition's component; the fields that template fills are then read-only. Saves the component
 * and emits `created` or `saved`.
 */
import { computed, reactive, ref, watch } from 'vue';
import { useToast } from '@/ds/toasts';
import type {
  ComponentDefinition,
  DefinedComponent,
  PortRange,
  Protocol,
  SystemComponent,
} from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { DEFINED_COMPONENT_TYPE_OPTIONS } from '@/types/subject-templates';
import { uuid } from '@/utils/uuid';
import { getErrorDetail } from '@/utils/httpErrors';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Select from '@/ds/components/Select/Select.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ sspId: string; component?: SystemComponent }>();
const emit = defineEmits<{
  created: [component: SystemComponent];
  saved: [component: SystemComponent];
  cancel: [];
}>();

const toast = useToast();
const api = useAuthenticatedInstance();
const base = `/api/oscal/system-security-plans/${props.sspId}/system-implementation/components`;

const STATUSES = [
  { value: 'operational', label: 'Operational' },
  { value: 'under-development', label: 'Under development' },
  { value: 'under-major-modification', label: 'Under major modification' },
  { value: 'disposition', label: 'Disposition' },
  { value: 'other', label: 'Other' },
];
/** Completions only: older records may hold other spellings, which stay as they are. */
const TRANSPORTS = ['TCP', 'UDP'];
const typeOptions = DEFINED_COMPONENT_TYPE_OPTIONS.map((o) => o.value);

const cloneProtocols = (protocols?: Protocol[]): Protocol[] =>
  (protocols ?? []).map((p) => ({
    ...p,
    portRanges: (p.portRanges ?? []).map((r) => ({ ...r })),
  }));

const draft = reactive<SystemComponent>({
  ...(props.component ?? { uuid: uuid(), props: [], links: [] }),
  type: props.component?.type ?? '',
  title: props.component?.title ?? '',
  description: props.component?.description ?? '',
  purpose: props.component?.purpose ?? '',
  remarks: props.component?.remarks ?? '',
  status: {
    state: props.component?.status?.state ?? 'operational',
    remarks: props.component?.status?.remarks ?? '',
  },
  protocols: cloneProtocols(props.component?.protocols),
});

// Start from a component definition's component (adding only) -------------------------------

const definitions = props.component
  ? undefined
  : useApiQuery<ComponentDefinition[]>('/api/oscal/component-definitions');
const definitionId = ref('');
const templates = ref<DefinedComponent[]>([]);
const templateId = ref('');
const template = computed(() =>
  templates.value.find((t) => t.uuid === templateId.value),
);
const definitionOptions = computed(() => [
  { value: '', label: 'No template' },
  ...(definitions?.data.value ?? []).map((d) => ({
    value: d.uuid,
    label: d.metadata?.title || d.uuid,
  })),
]);
const templateOptions = computed(() => [
  { value: '', label: 'Choose a component' },
  ...templates.value.map((t) => ({ value: t.uuid, label: t.title || t.uuid })),
]);

watch(definitionId, async (id) => {
  templateId.value = '';
  templates.value = [];
  if (!id) return;
  try {
    const response = await api.get<{ data: DefinedComponent[] }>(
      `/api/oscal/component-definitions/${id}/components`,
    );
    templates.value = response.data.data ?? [];
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "That definition's components didn't load",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
});
watch(template, (t) => {
  if (!t) {
    draft.definedComponentId = undefined;
    return;
  }
  Object.assign(draft, {
    type: t.type || '',
    title: t.title || '',
    description: t.description || '',
    purpose: t.purpose || '',
    remarks: t.remarks || '',
    definedComponentId: t.uuid,
    protocols: cloneProtocols(t.protocols),
    props: (t.props ?? []).map((p) => ({ ...p })),
    links: (t.links ?? []).map((l) => ({ ...l })),
    responsibleRoles: (t.responsibleRoles ?? []).map((r) => ({ ...r })),
  });
});
/** Fields the chosen template fills stay as it says. */
const locked = (value?: string) => Boolean(template.value && value?.trim());
const protocolsLocked = computed(
  () => (template.value?.protocols?.length ?? 0) > 0,
);

// Save ---------------------------------------------------------------------------------------

const newProtocol = (): Protocol => ({
  uuid: uuid(),
  title: '',
  name: '',
  portRanges: [],
});
const newRange = (): PortRange => ({ transport: 'TCP', start: 0, end: 0 });
const numberModel = (range: PortRange, key: 'start' | 'end') =>
  computed({
    get: () => String(range[key] ?? ''),
    set: (value: string) => (range[key] = Number(value) || 0),
  });

const errors = reactive({ type: '', title: '', description: '', purpose: '' });
const saving = ref(false);
const saveError = ref('');

async function save() {
  errors.type = draft.type?.trim() ? '' : 'Enter a type, e.g. service.';
  errors.title = draft.title?.trim() ? '' : 'Enter a title.';
  errors.description = draft.description?.trim() ? '' : 'Enter a description.';
  errors.purpose = draft.purpose?.trim() ? '' : 'Enter its purpose.';
  if (Object.values(errors).some(Boolean)) return;
  saving.value = true;
  saveError.value = '';
  const body: SystemComponent = {
    ...draft,
    remarks: draft.remarks?.trim() || undefined,
    protocols: (draft.protocols ?? []).filter(
      (p) => p.title || p.name || (p.portRanges?.length ?? 0) > 0,
    ),
  };
  try {
    const response = props.component
      ? await api.put<{ data: SystemComponent }>(`${base}/${body.uuid}`, body, {
          transformRequest: [decamelizeKeys],
        })
      : await api.post<{ data: SystemComponent }>(base, body, {
          transformRequest: [decamelizeKeys],
        });
    const saved = response.data.data;
    if (!saved?.uuid)
      throw new Error(
        'The component may not have been saved. Reload to check.',
      );
    toast.add({
      severity: 'success',
      summary: props.component ? 'Component saved' : 'Component added',
      life: 3000,
    });
    if (props.component) emit('saved', saved);
    else emit('created', saved);
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
      <Grid v-if="definitions" min="sm" gap="4">
        <FormField
          label="Start from a component definition"
          hint="Optional. Fills the fields from one of its components."
        >
          <Select v-model="definitionId" :options="definitionOptions" />
        </FormField>
        <FormField v-if="definitionId" label="Component">
          <Select v-model="templateId" :options="templateOptions" />
        </FormField>
      </Grid>
      <Text v-if="template" variant="caption"
        >Fields filled from {{ template.title }} can't be changed here.</Text
      >
      <Grid min="sm" gap="4">
        <FormField
          label="Title"
          required
          :readonly="locked(template?.title)"
          :error="errors.title"
        >
          <TextInput v-model="draft.title" />
        </FormField>
        <FormField
          label="Type"
          required
          :readonly="locked(template?.type)"
          :error="errors.type"
        >
          <TextInput v-model="draft.type" :options="typeOptions" />
        </FormField>
      </Grid>
      <FormField
        label="Description"
        required
        :readonly="locked(template?.description)"
        :error="errors.description"
      >
        <Textarea v-model="draft.description" :rows="3" />
      </FormField>
      <FormField
        label="Purpose"
        required
        :readonly="locked(template?.purpose)"
        :error="errors.purpose"
      >
        <Textarea v-model="draft.purpose" :rows="2" />
      </FormField>
      <Grid min="sm" gap="4">
        <FormField label="Status" required>
          <Select v-model="draft.status.state" :options="STATUSES" />
        </FormField>
        <FormField label="Status remarks">
          <TextInput v-model="draft.status.remarks" />
        </FormField>
      </Grid>
      <FormField label="Remarks" :readonly="locked(template?.remarks)">
        <Textarea v-model="draft.remarks" :rows="2" />
      </FormField>
      <FieldList
        v-model="draft.protocols!"
        legend="Protocols"
        item-label="protocol"
        add-label="Add protocol"
        empty-text="No protocols."
        :new-item="newProtocol"
        :disabled-reason="
          protocolsLocked ? 'The template sets the protocols.' : undefined
        "
      >
        <template #item="{ item }">
          <Stack gap="2">
            <Grid min="sm" gap="2">
              <FormField
                label="Name"
                :readonly="protocolsLocked"
                hint="e.g. https"
                ><TextInput v-model="item.name"
              /></FormField>
              <FormField label="Title" :readonly="protocolsLocked"
                ><TextInput v-model="item.title"
              /></FormField>
            </Grid>
            <FieldList
              v-model="item.portRanges!"
              legend="Port ranges"
              item-label="port range"
              add-label="Add port range"
              empty-text="No port ranges."
              :new-item="newRange"
              :disabled-reason="
                protocolsLocked ? 'The template sets the protocols.' : undefined
              "
            >
              <template #item="{ item: range }">
                <Grid min="sm" gap="2">
                  <FormField label="Transport" :readonly="protocolsLocked"
                    ><TextInput v-model="range.transport" :options="TRANSPORTS"
                  /></FormField>
                  <FormField label="From port" :readonly="protocolsLocked"
                    ><TextInput
                      v-model="numberModel(range, 'start').value"
                      type="number"
                  /></FormField>
                  <FormField label="To port" :readonly="protocolsLocked"
                    ><TextInput
                      v-model="numberModel(range, 'end').value"
                      type="number"
                  /></FormField>
                </Grid>
              </template>
            </FieldList>
          </Stack>
        </template>
      </FieldList>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">{{
          component ? 'Save component' : 'Add component'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
