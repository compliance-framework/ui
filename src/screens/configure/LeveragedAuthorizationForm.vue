<script setup lang="ts">
/**
 * Add or edit a leveraged authorization in a security plan: its title, the party that granted it
 * (chosen from the parties), when, and remarks. Editing keeps its other fields.
 */
import { computed, reactive, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { LeveragedAuthorization, Party } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { uuid } from '@/utils/uuid';
import { getErrorDetail } from '@/utils/httpErrors';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ sspId: string; auth?: LeveragedAuthorization }>();
const emit = defineEmits<{
  created: [auth: LeveragedAuthorization];
  saved: [auth: LeveragedAuthorization];
  cancel: [];
}>();

const toast = useToast();
const api = useAuthenticatedInstance();
const base = `/api/oscal/system-security-plans/${props.sspId}/system-implementation/leveraged-authorizations`;

const parties = useApiQuery<Party[]>('/api/oscal/parties');
const partyOptions = computed(() => {
  const options = (parties.data.value ?? []).map((p) => ({
    value: p.uuid,
    label: p.name || p.shortName || p.uuid,
  }));
  // A party not in the list (e.g. from another system) still shows by its UUID.
  const current = props.auth?.partyUuid;
  return current && !options.some((o) => o.value === current)
    ? [...options, { value: current, label: current }]
    : options;
});

const draft = reactive({
  title: props.auth?.title ?? '',
  partyUuid: props.auth?.partyUuid ?? '',
  dateAuthorized: props.auth?.dateAuthorized?.slice(0, 10) ?? '',
  remarks: props.auth?.remarks ?? '',
});
const errors = reactive({ title: '', party: '', date: '' });
const saving = ref(false);
const saveError = ref('');

async function save() {
  errors.title = draft.title.trim() ? '' : 'Enter a title.';
  errors.party = draft.partyUuid ? '' : 'Choose the party that granted it.';
  errors.date = draft.dateAuthorized ? '' : 'Enter when it was granted.';
  if (errors.title || errors.party || errors.date) return;
  saving.value = true;
  saveError.value = '';
  const body: LeveragedAuthorization = {
    ...(props.auth ?? { uuid: uuid() }),
    title: draft.title.trim(),
    partyUuid: draft.partyUuid,
    dateAuthorized: draft.dateAuthorized,
    remarks: draft.remarks.trim() || undefined,
  };
  try {
    const response = props.auth
      ? await api.put<{ data: LeveragedAuthorization }>(
          `${base}/${props.auth.uuid}`,
          body,
          { transformRequest: [decamelizeKeys] },
        )
      : await api.post<{ data: LeveragedAuthorization }>(base, body, {
          transformRequest: [decamelizeKeys],
        });
    toast.add({
      severity: 'success',
      summary: props.auth ? 'Authorization saved' : 'Authorization added',
      life: 3000,
    });
    if (props.auth) emit('saved', response.data.data);
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
      <FormField label="Title" required :error="errors.title">
        <TextInput v-model="draft.title" />
      </FormField>
      <Grid min="sm" gap="4">
        <FormField label="Granted by" required :error="errors.party">
          <Combobox
            v-model="draft.partyUuid"
            :options="partyOptions"
            :loading="parties.status.value === 'loading'"
            placeholder="Party name"
          />
        </FormField>
        <FormField label="Date authorized" required :error="errors.date">
          <TextInput v-model="draft.dateAuthorized" type="date" />
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
          auth ? 'Save authorization' : 'Add authorization'
        }}</Button>
      </Cluster>
    </Stack>
  </form>
</template>
