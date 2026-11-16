<script setup lang="ts">
/**
 * Add or edit a POA&M observation: title, description, how it was observed (methods), its types,
 * when it was collected and expires, and remarks. Methods and types offer the OSCAL values, plus
 * any others the record already has. Emits `created` or `saved`.
 */
import { computed, reactive, ref } from 'vue';
import { useToast } from '@/ds/toasts';
import type { Observation } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { uuid } from '@/utils/uuid';
import { getErrorDetail } from '@/utils/httpErrors';
import Button from '@/ds/components/Button/Button.vue';
import CheckboxGroup from '@/ds/components/CheckboxGroup/CheckboxGroup.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ poamId: string; observation?: Observation }>();
const emit = defineEmits<{
  created: [observation: Observation];
  saved: [observation: Observation];
  cancel: [];
}>();

const toast = useToast();
const api = useAuthenticatedInstance();
const base = `/api/oscal/plan-of-action-and-milestones/${props.poamId}/observations`;

const METHODS = ['EXAMINE', 'INTERVIEW', 'TEST', 'UNKNOWN'];
const TYPES = [
  'ssp-statement-issue',
  'control-objective',
  'mitigation',
  'finding',
  'historic',
];
const options = (known: string[], current: string[] = []) =>
  [...new Set([...known, ...current])].map((value) => ({
    value,
    label: value.charAt(0) + value.slice(1).toLowerCase().replace(/-/g, ' '),
  }));

/** ISO timestamps as the local "YYYY-MM-DDTHH:mm" a datetime field shows, and back. */
const toLocal = (iso?: string) => {
  if (!iso || Number.isNaN(Date.parse(iso))) return '';
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};
const toIso = (local: string) => new Date(local).toISOString();

const draft = reactive({
  title: props.observation?.title ?? '',
  description: props.observation?.description ?? '',
  methods: [...(props.observation?.methods ?? [])] as string[],
  types: [...(props.observation?.types ?? [])] as string[],
  collected: toLocal(props.observation?.collected),
  expires: toLocal(props.observation?.expires),
  remarks: props.observation?.remarks ?? '',
});
const methodOptions = computed(() =>
  options(METHODS, props.observation?.methods as string[] | undefined),
);
const typeOptions = computed(() =>
  options(TYPES, props.observation?.types as string[] | undefined),
);

const errors = reactive({ description: '', methods: '', expires: '' });
const saving = ref(false);
const saveError = ref('');

async function save() {
  errors.description = draft.description.trim()
    ? ''
    : 'Describe what was observed.';
  errors.methods = draft.methods.length ? '' : 'Choose at least one method.';
  errors.expires =
    draft.expires && draft.collected && draft.expires < draft.collected
      ? 'It must expire after it was collected.'
      : '';
  if (errors.description || errors.methods || errors.expires) return;
  saving.value = true;
  saveError.value = '';
  const body: Observation = {
    ...(props.observation ?? { uuid: uuid() }),
    title: draft.title.trim() || undefined,
    description: draft.description.trim(),
    methods: draft.methods,
    types: draft.types.length ? draft.types : undefined,
    // OSCAL requires collected: an empty field means now.
    collected: draft.collected
      ? toIso(draft.collected)
      : new Date().toISOString(),
    expires: draft.expires ? toIso(draft.expires) : undefined,
    remarks: draft.remarks.trim() || undefined,
  } as Observation;
  try {
    const response = props.observation
      ? await api.put<{ data: Observation }>(
          `${base}/${props.observation.uuid}`,
          body,
          {
            transformRequest: [decamelizeKeys],
          },
        )
      : await api.post<{ data: Observation }>(base, body, {
          transformRequest: [decamelizeKeys],
        });
    toast.add({
      severity: 'success',
      summary: props.observation ? 'Observation saved' : 'Observation added',
      life: 3000,
    });
    if (props.observation) emit('saved', response.data.data);
    else emit('created', response.data.data);
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
      <FormField label="Title"><TextInput v-model="draft.title" /></FormField>
      <FormField label="Description" required :error="errors.description">
        <Textarea v-model="draft.description" :rows="3" />
      </FormField>
      <Grid min="sm" gap="4">
        <CheckboxGroup
          v-model="draft.methods"
          legend="Methods"
          required
          :options="methodOptions"
          :error="errors.methods"
        />
        <CheckboxGroup
          v-model="draft.types"
          legend="Types"
          :options="typeOptions"
        />
      </Grid>
      <Grid min="sm" gap="4">
        <FormField label="Collected" hint="Empty means now.">
          <TextInput v-model="draft.collected" type="datetime-local" />
        </FormField>
        <FormField label="Expires" :error="errors.expires">
          <TextInput v-model="draft.expires" type="datetime-local" />
        </FormField>
      </Grid>
      <FormField label="Remarks"
        ><Textarea v-model="draft.remarks" :rows="2"
      /></FormField>
      <InlineMessage v-if="saveError" tone="error" title="Not saved">
        <p>{{ saveError }}</p>
      </InlineMessage>
      <Cluster justify="end" gap="2">
        <Button @click="emit('cancel')">Cancel</Button>
        <Button variant="primary" type="submit" :loading="saving">{{
          observation ? 'Save observation' : 'Add observation'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
