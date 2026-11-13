<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthenticatedInstance, decamelizeKeys } from '@/composables/axios';
import { useEvidenceConfig } from '@/composables/evidence/useEvidenceConfig';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import type { Link, Property } from '@/oscal';
import type { Evidence, EvidenceLabel } from '@/stores/evidence';
import { usePermissionsStore } from '@/stores/permissions';
import type { DataResponse } from '@/stores/types';
import { getErrorDetail, getErrorStatus } from '@/utils/httpErrors';
import { uuid } from '@/utils/uuid';
import type { QueryStatus } from '@/ds/query';
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import Button from '@/ds/components/Button/Button.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import FieldList from '@/ds/components/FieldList/FieldList.vue';
import FileField from '@/ds/components/FileField/FileField.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import Grid from '@/ds/components/layout/Grid.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import RadioGroup from '@/ds/components/RadioGroup/RadioGroup.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import Text from '@/ds/components/Text/Text.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import SubjectsField from './SubjectsField.vue';
import {
  STATUS_OPTIONS,
  attach,
  draftFrom,
  payload,
  readBase64,
  toDateInput,
  validate,
  type EvidenceDraft,
} from './evidenceForm';

/**
 * New evidence (/evidence/create) and Re-submit (/evidence/:id/update), as on the classic form.
 * Re-submitting keeps the record's stream UUID, so the new record joins the same stream and
 * becomes its latest; its labels are shown but can't change. Errors show on submit, beside their
 * fields, with a summary at the top.
 */
const route = useRoute();
const router = useRouter();
const api = useAuthenticatedInstance();
const permissions = usePermissionsStore();
const { manualSubjectRequired } = useEvidenceConfig();

const updating = route.name === 'evidence:update';
const sourceId = updating ? String(route.params.id) : undefined;

const status = ref<QueryStatus | 'missing'>(updating ? 'loading' : 'ready');
const draft = ref<EvidenceDraft>(draftFrom(undefined, uuid));

async function load(): Promise<void> {
  if (!sourceId) return;
  status.value = 'loading';
  try {
    const response = await api.get<DataResponse<Evidence>>(
      `/api/evidence/${sourceId}`,
    );
    draft.value = draftFrom(response.data.data, uuid);
    status.value = 'ready';
  } catch (error) {
    const code = getErrorStatus(error);
    status.value =
      code === 400 || code === 403 || code === 404 ? 'missing' : 'error';
  }
}
void load();

// New rows for the label, property and link lists.
const newLabel = (): EvidenceLabel => ({ name: '', value: '' });
const newProp = (): Property => ({ name: '', value: '' });
const newLink = (): Link => ({ href: '', rel: '', text: '' });

// Attachments ---------------------------------------------------------------------------------

const file = ref<File | null>(null);
const attachError = ref<string>();

async function addAttachment(): Promise<void> {
  if (!file.value) return;
  attachError.value = undefined;
  try {
    const { resource, link } = attach(
      file.value,
      await readBase64(file.value),
      uuid(),
    );
    draft.value.resources.push(resource);
    draft.value.links.push(link);
    file.value = null;
  } catch {
    attachError.value = "That file couldn't be read. Try another.";
  }
}

// Submit --------------------------------------------------------------------------------------

const attempted = ref(false);
const saving = ref(false);
const saveError = ref<string>();
const errors = computed(() =>
  attempted.value
    ? validate(draft.value, {
        subjectRequired: manualSubjectRequired.value,
        today: toDateInput(new Date().toISOString()),
      })
    : {},
);
const errorList = computed(() => Object.values(errors.value));

const action = updating ? ACTIONS.UPDATE : ACTIONS.CREATE;
const submitDenied = computed(() =>
  permissions.can(RESOURCES.EVIDENCE, action)
    ? undefined
    : `Your access doesn't include ${updating ? 're-submitting' : 'creating'} evidence.`,
);

async function submit(): Promise<void> {
  attempted.value = true;
  if (errorList.value.length || submitDenied.value) return;
  saving.value = true;
  saveError.value = undefined;
  try {
    const response = await api.post<DataResponse<Evidence>>(
      '/api/evidence',
      payload(draft.value),
      { transformRequest: [decamelizeKeys] },
    );
    await router.push({
      name: 'evidence:view',
      params: { evidenceId: response.data.data.id },
    });
  } catch (error) {
    saveError.value = await getErrorDetail(
      error,
      "The evidence couldn't be saved. Your entries are kept; try again.",
    );
  } finally {
    saving.value = false;
  }
}

const title = updating ? 'Re-submit evidence' : 'New evidence';
const description = updating
  ? 'Submit a new revision. It joins the same evidence stream and becomes the latest record.'
  : 'Record a piece of evidence that supports your control implementations.';
const back = computed(() =>
  sourceId
    ? {
        label: 'Evidence record',
        to: { name: 'evidence:view', params: { evidenceId: sourceId } },
      }
    : { label: 'Evidence', to: { name: 'evidence:index' } },
);
</script>

<template>
  <Stack gap="6">
    <Breadcrumbs :crumbs="[back]" />
    <PageHeader :title="title" :description="description" />

    <DataState
      v-if="status !== 'ready'"
      :status="status === 'missing' ? 'empty' : status"
      subject="this evidence"
      empty-title="We couldn't find this evidence"
      empty-body="It may have been removed, or you may not have access to it."
      icon="evidence"
      skeleton="panel"
      @retry="load"
    />

    <form v-else novalidate @submit.prevent="submit">
      <Stack gap="6">
        <InlineMessage
          v-if="errorList.length"
          tone="error"
          title="Check the highlighted fields"
        >
          <ul>
            <li v-for="message in errorList" :key="message">{{ message }}</li>
          </ul>
        </InlineMessage>

        <Panel title="Details">
          <Stack gap="4">
            <FormField label="Title" required :error="errors.title">
              <TextInput
                v-model="draft.title"
                placeholder="e.g. Quarterly backup restore test"
              />
            </FormField>
            <FormField label="Description">
              <Textarea
                v-model="draft.description"
                :rows="3"
                placeholder="What does this evidence demonstrate?"
              />
            </FormField>
            <RadioGroup
              v-model="draft.state"
              legend="Status"
              variant="segmented"
              required
              :options="STATUS_OPTIONS"
              :error="errors.state"
            />
            <FormField label="Reason" hint="Why the status is what it is.">
              <TextInput v-model="draft.reason" />
            </FormField>
            <SubjectsField
              v-model="draft.subjects"
              :required="manualSubjectRequired"
              :error="errors.subjects"
            />
          </Stack>
        </Panel>

        <Panel
          title="Labels"
          description="Labels make evidence searchable and drive control matching."
        >
          <template v-if="updating">
            <Cluster v-if="draft.labels.length" gap="1">
              <Tag
                v-for="label in draft.labels"
                :key="`${label.name}=${label.value}`"
                :label="`${label.name}=${label.value}`"
              />
            </Cluster>
            <Text v-else variant="secondary">This evidence has no labels.</Text>
            <Text variant="caption"
              >A re-submitted record keeps the stream's labels.</Text
            >
          </template>
          <FieldList
            v-else
            v-model="draft.labels"
            legend="Labels"
            item-label="label"
            add-label="Add label"
            empty-text="No labels added."
            :new-item="newLabel"
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
        </Panel>

        <Panel
          title="Attachments"
          description="Each file is linked from the evidence as a reference."
        >
          <Stack gap="3">
            <Stack v-if="draft.resources.length" gap="1" as="ul">
              <Text
                v-for="resource in draft.resources"
                :key="resource.uuid"
                as="span"
                >{{ resource.title }}</Text
              >
            </Stack>
            <Text v-else variant="secondary">No files attached.</Text>
            <Cluster gap="2" align="end">
              <FormField label="File" :error="attachError">
                <FileField v-model="file" accept="*/*" />
              </FormField>
              <Button
                icon="add"
                :disabled-reason="file ? undefined : 'Choose a file first.'"
                @click="addAttachment"
                >Attach</Button
              >
            </Cluster>
          </Stack>
        </Panel>

        <Panel title="Collection window and expiry">
          <Stack gap="3">
            <Grid min="sm" gap="4">
              <FormField label="Start date" required :error="errors.start">
                <TextInput v-model="draft.start" type="date" />
              </FormField>
              <FormField label="End date" required :error="errors.end">
                <TextInput v-model="draft.end" type="date" />
              </FormField>
              <FormField
                label="Expiry date"
                hint="When this evidence stops being valid. Left empty, the server applies its default."
              >
                <TextInput v-model="draft.expires" type="date" />
              </FormField>
            </Grid>
            <InlineMessage
              v-if="errors.dates"
              tone="error"
              :title="errors.dates"
            />
          </Stack>
        </Panel>

        <Panel title="Properties">
          <FieldList
            v-model="draft.props"
            legend="Properties"
            item-label="property"
            add-label="Add property"
            empty-text="No properties."
            :new-item="newProp"
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
        </Panel>

        <Panel
          title="Links"
          description="External references, or #resource references to attachments. Attached files appear here automatically."
        >
          <FieldList
            v-model="draft.links"
            legend="Links"
            item-label="link"
            add-label="Add link"
            empty-text="No links."
            :new-item="newLink"
          >
            <template #item="{ item }">
              <Grid min="sm" gap="2">
                <FormField label="Link"
                  ><TextInput v-model="item.href"
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
        </Panel>

        <InlineMessage v-if="saveError" tone="error" title="Not saved">
          <p>{{ saveError }}</p>
        </InlineMessage>

        <Cluster justify="end" gap="2">
          <Button :to="back.to">Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            :loading="saving"
            :disabled-reason="submitDenied"
            >{{ updating ? 'Re-submit evidence' : 'Create evidence' }}</Button
          >
        </Cluster>
      </Stack>
    </form>
  </Stack>
</template>
