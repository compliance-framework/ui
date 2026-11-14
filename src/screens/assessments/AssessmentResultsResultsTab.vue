<script setup lang="ts">
/**
 * Assessment results' Results tab: each result (one assessment run) is a disclosure with its
 * period, description and the findings, observations and risks it recorded, and a menu to delete
 * it. New result asks for a title, description and period; it reviews all controls, as before.
 */
import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { v4 as uuidv4 } from 'uuid';
import type { Result } from '@/oscal';
import { decamelizeKeys, useAuthenticatedInstance } from '@/composables/axios';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import { getErrorDetail } from '@/utils/httpErrors';
import { formatDateTime, plural } from '@/ds/format';
import { useApiQuery } from '@/ds/query';
import Button from '@/ds/components/Button/Button.vue';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import DescriptionList from '@/ds/components/DescriptionList/DescriptionList.vue';
import Dialog from '@/ds/components/Dialog/Dialog.vue';
import Disclosure from '@/ds/components/Disclosure/Disclosure.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import ItemList from '@/ds/components/ItemList/ItemList.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuEntry } from '@/ds/components/Menu/menuEntries';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const emit = defineEmits<{ update: [] }>();

const route = useRoute();
const toast = useToast();
const api = useAuthenticatedInstance();
const { can } = usePermissions();

const id = route.params.id as string;
const base = `/api/oscal/assessment-results/${id}/results`;

const denied = (action: string, verb: string) =>
  can(RESOURCES.ASSESSMENT_RESULTS, action)
    ? undefined
    : `Your access doesn't include ${verb} assessment results.`;

const results = useApiQuery<Result[]>(base, {
  isEmpty: (list) => list.length === 0,
});

const facts = (result: Result) => [
  { key: 'description', label: 'Description', value: result.description },
  { key: 'start', label: 'Started', value: formatDateTime(result.start) },
  {
    key: 'end',
    label: 'Ended',
    value: result.end ? formatDateTime(result.end) : '',
  },
  { key: 'remarks', label: 'Remarks', value: result.remarks },
];

const tags = (result: Result) => [
  plural(result.findings?.length ?? 0, 'finding'),
  plural(result.observations?.length ?? 0, 'observation'),
  plural(result.risks?.length ?? 0, 'risk'),
];

const listOf = (
  entries: { uuid: string; title?: string; description?: string }[] = [],
  noun: string,
) =>
  entries.map((entry) => ({
    id: entry.uuid,
    title: entry.title || `Untitled ${noun}`,
    meta: entry.description,
  }));

// New result ---------------------------------------------------------------------------------

const localNow = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};
const creating = ref(false);
const saving = ref(false);
const saveError = ref('');
const draft = reactive({ title: '', description: '', start: '', end: '' });
const errors = reactive({ title: '', start: '', end: '' });

function openCreate() {
  Object.assign(draft, {
    title: '',
    description: '',
    start: localNow(),
    end: '',
  });
  Object.assign(errors, { title: '', start: '', end: '' });
  saveError.value = '';
  creating.value = true;
}

async function create() {
  errors.title = draft.title.trim() ? '' : 'Enter a title.';
  errors.start = draft.start ? '' : 'Enter when the assessment started.';
  errors.end =
    draft.end && draft.start && draft.end < draft.start
      ? 'The end must be after the start.'
      : '';
  if (errors.title || errors.start || errors.end) return;
  saving.value = true;
  saveError.value = '';
  try {
    const response = await api.post<{ data: Result }>(
      base,
      {
        uuid: uuidv4(),
        title: draft.title.trim(),
        description: draft.description.trim(),
        start: new Date(draft.start).toISOString(),
        end: draft.end ? new Date(draft.end).toISOString() : undefined,
        reviewedControls: { controlSelections: [{ includeAll: {} }] },
      },
      { transformRequest: [decamelizeKeys] },
    );
    results.data.value = [...(results.data.value ?? []), response.data.data];
    creating.value = false;
    toast.add({
      severity: 'success',
      summary: 'Result added',
      detail: `${draft.title.trim()} was added.`,
      life: 3000,
    });
    emit('update');
  } catch (error) {
    saveError.value = await getErrorDetail(error, 'Try again.');
  } finally {
    saving.value = false;
  }
}

// Delete -------------------------------------------------------------------------------------

const deleting = ref<Result>();
const deleteOpen = computed({
  get: () => Boolean(deleting.value),
  set: (open: boolean) => {
    if (!open) deleting.value = undefined;
  },
});

async function remove() {
  const result = deleting.value;
  deleting.value = undefined;
  if (!result) return;
  try {
    await api.delete(`${base}/${result.uuid}`);
    results.data.value = (results.data.value ?? []).filter(
      (r) => r.uuid !== result.uuid,
    );
    toast.add({
      severity: 'success',
      summary: 'Result deleted',
      detail: `${result.title} was deleted.`,
      life: 3000,
    });
    emit('update');
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: "The result wasn't deleted",
      detail: await getErrorDetail(error, 'Try again.'),
      life: 5000,
    });
  }
}

const actions = (result: Result): MenuEntry[] => [
  {
    label: 'Delete result',
    icon: 'delete',
    tone: 'danger',
    disabledReason: denied(ACTIONS.DELETE, 'deleting'),
    onSelect: () => (deleting.value = result),
  },
];
</script>

<template>
  <Stack gap="5">
    <div>
      <Button
        variant="primary"
        icon="add"
        :disabled-reason="denied(ACTIONS.CREATE, 'adding')"
        @click="openCreate"
        >New result</Button
      >
    </div>
    <DataState
      :status="results.status.value"
      subject="results"
      empty-title="No results yet"
      empty-body="Each result records one assessment run: its period, and the findings, observations and risks it produced."
      icon="assessments"
      @retry="results.retry"
    >
      <Stack gap="3">
        <Disclosure
          v-for="result in results.data.value"
          :key="result.uuid"
          :label="result.title || 'Untitled result'"
        >
          <Stack gap="4">
            <Cluster justify="between" gap="2">
              <Cluster gap="1">
                <Tag v-for="tag in tags(result)" :key="tag" :label="tag" />
              </Cluster>
              <Menu
                :label="`Actions for ${result.title}`"
                :items="actions(result)"
              />
            </Cluster>
            <DescriptionList :items="facts(result)" layout="stacked" />
            <Stack gap="2">
              <Text variant="label">Findings</Text>
              <ItemList
                :items="listOf(result.findings, 'finding')"
                empty-text="No findings."
                dense
              />
            </Stack>
            <Stack gap="2">
              <Text variant="label">Observations</Text>
              <ItemList
                :items="listOf(result.observations, 'observation')"
                empty-text="No observations."
                dense
              />
            </Stack>
            <Stack gap="2">
              <Text variant="label">Risks</Text>
              <ItemList
                :items="listOf(result.risks, 'risk')"
                empty-text="No risks."
                dense
              />
            </Stack>
          </Stack>
        </Disclosure>
      </Stack>
    </DataState>

    <Dialog
      v-model:open="creating"
      title="New result"
      description="One assessment run. It reviews all controls of the plan."
      :dirty="Boolean(draft.title || draft.description)"
    >
      <template #default="{ requestClose }">
        <form novalidate @submit.prevent="create">
          <Stack gap="4">
            <FormField label="Title" required :error="errors.title">
              <TextInput v-model="draft.title" />
            </FormField>
            <FormField label="Description">
              <Textarea v-model="draft.description" :rows="3" />
            </FormField>
            <FormField label="Started" required :error="errors.start">
              <TextInput v-model="draft.start" type="datetime-local" />
            </FormField>
            <FormField label="Ended" :error="errors.end">
              <TextInput v-model="draft.end" type="datetime-local" />
            </FormField>
            <InlineMessage v-if="saveError" tone="error" title="Not added">
              <p>{{ saveError }}</p>
            </InlineMessage>
            <Cluster justify="end" gap="2">
              <Button @click="requestClose">Cancel</Button>
              <Button variant="primary" type="submit" :loading="saving"
                >Add result</Button
              >
            </Cluster>
          </Stack>
        </form>
      </template>
    </Dialog>
    <ConfirmDialog
      v-model:open="deleteOpen"
      :title="`Delete ${deleting?.title || 'this result'}?`"
      confirm-label="Delete result"
      @confirm="remove"
      ><Text
        >Its findings, observations and risks are deleted with it. This can't be
        undone.</Text
      ></ConfirmDialog
    >
  </Stack>
</template>
