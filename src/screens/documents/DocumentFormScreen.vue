<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { v4 as uuidv4 } from 'uuid';
import { useAuthenticatedInstance, decamelizeKeys } from '@/composables/axios';
import { ACTIONS } from '@/constants/permissions';
import { usePermissionsStore } from '@/stores/permissions';
import type { DataResponse } from '@/stores/types';
import { getErrorDetail, getErrorStatus } from '@/utils/httpErrors';
import type { QueryStatus } from '@/ds/query';
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import Button from '@/ds/components/Button/Button.vue';
import DataState from '@/ds/components/DataState/DataState.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import Textarea from '@/ds/components/Textarea/Textarea.vue';
import TextInput from '@/ds/components/TextInput/TextInput.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import Select from '@/ds/components/Select/Select.vue';
import {
  CATALOG_TYPE_OPTIONS,
  DOCUMENT_FORMS,
  validateDocument,
  withCatalogType,
} from './formKinds';

/**
 * Create or edit an OSCAL document's metadata (component definitions, profiles, assessment plans,
 * POA&Ms), configured in formKinds.ts. Edit loads the whole document and sends it back with
 * the changed fields, as the classic pages did. Errors show next to their fields.
 */
const props = defineProps<{ kind: string; mode: 'create' | 'edit' }>();

const route = useRoute();
const router = useRouter();
const toast = useToast();
const api = useAuthenticatedInstance();
const permissions = usePermissionsStore();
const config = DOCUMENT_FORMS[props.kind]!;
const id = props.mode === 'edit' ? String(route.params.id) : '';

type Doc = Record<string, unknown> & {
  uuid?: string;
  metadata: Record<string, unknown>;
  importSsp?: Record<string, unknown>;
  importAp?: Record<string, unknown>;
  systemId?: { id?: string; identifierType?: string };
};

const fields = reactive({
  uuid: uuidv4(),
  title: '',
  version: '',
  remarks: '',
  published: '',
  importHref: '',
  importRemarks: '',
  resultTitle: '',
  resultDescription: '',
  systemIdValue: '',
  systemIdType: '',
  catalogType: 'standard',
});
const loaded = ref<Doc>();
const status = ref<QueryStatus>(props.mode === 'edit' ? 'loading' : 'ready');

function fill(doc: Doc): void {
  const meta = doc.metadata ?? {};
  fields.uuid = doc.uuid ?? fields.uuid;
  fields.title = String(meta.title ?? '');
  fields.version = String(meta.version ?? '');
  fields.remarks = String(meta.remarks ?? '');
  fields.published = meta.published ? String(meta.published).slice(0, 10) : '';
  const imported = (
    config.importRef ? doc[config.importRef.key] : undefined
  ) as { href?: string; remarks?: string } | undefined;
  fields.systemIdValue = String(doc.systemId?.id ?? '');
  fields.systemIdType = String(doc.systemId?.identifierType ?? '');
  fields.importHref = String(imported?.href ?? '');
  fields.importRemarks = String(imported?.remarks ?? '');
}

async function load(): Promise<void> {
  status.value = 'loading';
  try {
    const response = await api.get<DataResponse<Doc>>(
      `${config.endpoint}/${id}${config.editFromFull ? '/full' : ''}`,
    );
    loaded.value = response.data.data;
    fill(loaded.value);
    status.value = 'ready';
  } catch (error) {
    status.value = getErrorStatus(error) === 403 ? 'forbidden' : 'error';
  }
}
if (props.mode === 'edit') void load();
else fill(config.blank() as Doc);

const attempted = ref(false);
const errors = computed(() =>
  attempted.value ? validateDocument(config, fields, props.mode) : {},
);
watch(
  () => fields.title,
  () => (saveError.value = undefined),
);

const title = computed(() =>
  props.mode === 'create'
    ? `New ${config.noun}`
    : `Edit ${fields.title || config.noun}`,
);
const back = computed(() =>
  props.mode === 'create'
    ? { label: config.listLabel, to: { name: config.listRoute } }
    : {
        label: loaded.value?.metadata.title
          ? String(loaded.value.metadata.title)
          : `This ${config.noun}`,
        to: config.detail(id),
      },
);
const denied = computed(() =>
  permissions.can(
    config.resource,
    props.mode === 'create' ? ACTIONS.CREATE : ACTIONS.UPDATE,
  )
    ? undefined
    : `Your access doesn't include ${props.mode === 'create' ? 'creating' : 'editing'} ${config.noun}s.`,
);

function payload(): Doc {
  const base = (loaded.value ?? config.blank()) as Doc;
  const doc: Doc = {
    ...base,
    uuid: props.mode === 'create' ? fields.uuid.trim() : base.uuid,
    metadata: {
      ...base.metadata,
      ...(config.catalogType
        ? {
            props: withCatalogType(
              base.metadata.props as Parameters<typeof withCatalogType>[0],
              fields.catalogType,
            ),
          }
        : {}),
      title: fields.title.trim(),
      remarks: fields.remarks.trim() || undefined,
      ...(config.version
        ? { version: fields.version.trim() || undefined }
        : {}),
      ...(config.published && fields.published
        ? { published: new Date(fields.published).toISOString() }
        : {}),
      ...(props.mode === 'edit'
        ? { lastModified: new Date().toISOString() }
        : {}),
    },
  };
  if (config.systemId)
    doc.systemId = {
      id: fields.systemIdValue.trim(),
      identifierType: fields.systemIdType.trim(),
    };
  if (config.importRef) {
    const key = config.importRef.key;
    const href = fields.importHref.trim();
    doc[key] =
      href || !config.importRef.optional
        ? {
            ...(base[key] as Record<string, unknown> | undefined),
            href,
            remarks: fields.importRemarks.trim() || undefined,
          }
        : undefined;
  }
  if (config.initialResult && props.mode === 'create')
    doc.results = [
      {
        uuid: uuidv4(),
        title: fields.resultTitle.trim(),
        description: fields.resultDescription.trim(),
        start: new Date().toISOString(),
        reviewedControls: { controlSelections: [{ includeAll: {} }] },
      },
    ];
  return doc;
}

const saving = ref(false);
const saveError = ref<string>();
async function submit(): Promise<void> {
  attempted.value = true;
  if (Object.keys(errors.value).length) return;
  saving.value = true;
  saveError.value = undefined;
  try {
    const request = { transformRequest: [decamelizeKeys] };
    const response =
      props.mode === 'create'
        ? await api.post<DataResponse<Doc>>(config.endpoint, payload(), request)
        : await api.put<DataResponse<Doc>>(
            `${config.endpoint}/${id}`,
            payload(),
            request,
          );
    if (props.mode === 'create' && response.data.data)
      config.created?.(response.data.data);
    toast.add({
      severity: 'success',
      summary: props.mode === 'create' ? 'Created' : 'Saved',
      detail: fields.title.trim(),
      life: 3000,
    });
    void router.push(
      config.detail(response.data.data?.uuid || id || fields.uuid.trim()),
    );
  } catch (error) {
    saveError.value = await getErrorDetail(
      error,
      props.mode === 'create'
        ? `The ${config.noun} couldn't be created. Try again.`
        : "The changes weren't saved. Try again.",
    );
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Stack gap="6">
    <Breadcrumbs :crumbs="[back]" />
    <PageHeader :title="title" />
    <DataState
      v-if="status !== 'ready'"
      :status="status"
      :subject="`this ${config.noun}`"
      skeleton="panel"
      @retry="load"
    />
    <Panel v-else>
      <form novalidate @submit.prevent="submit">
        <Stack gap="4">
          <Stack v-if="mode === 'create'" gap="2" align="start">
            <FormField
              label="ID"
              required
              :error="errors.uuid"
              hint="A UUID. Keep the generated one unless you're recreating an existing document."
            >
              <TextInput v-model="fields.uuid" />
            </FormField>
            <Button
              size="sm"
              variant="tertiary"
              icon="refresh"
              @click="fields.uuid = uuidv4()"
              >Generate a new ID</Button
            >
          </Stack>
          <FormField label="Title" required :error="errors.title">
            <TextInput v-model="fields.title" />
          </FormField>
          <FormField
            v-if="config.catalogType && mode === 'create'"
            label="Type"
            hint="Which tab the catalog is listed under."
          >
            <Select
              v-model="fields.catalogType"
              :options="CATALOG_TYPE_OPTIONS"
            />
          </FormField>
          <FormField
            v-if="config.version"
            label="Version"
            :required="config.versionRequired"
            :error="errors.version"
          >
            <TextInput v-model="fields.version" placeholder="1.0" />
          </FormField>
          <FormField
            v-if="config.published && mode === 'edit'"
            label="Published"
          >
            <TextInput v-model="fields.published" type="date" />
          </FormField>
          <FormField label="Remarks">
            <Textarea v-model="fields.remarks" :rows="4" />
          </FormField>
          <template v-if="config.systemId">
            <FormField
              label="System ID"
              hint="The identifier of the system this POA&M tracks."
              required
              :error="errors.systemIdValue"
            >
              <TextInput v-model="fields.systemIdValue" />
            </FormField>
            <FormField
              label="Identifier type"
              hint="Optional: a URI for the identifier scheme, e.g. https://ietf.org/rfc/rfc4122."
            >
              <TextInput v-model="fields.systemIdType" />
            </FormField>
          </template>
          <template v-if="config.importRef">
            <FormField
              :label="config.importRef.label"
              :hint="config.importRef.hint"
              :required="!config.importRef.optional"
              :error="errors.importHref"
            >
              <TextInput
                v-model="fields.importHref"
                :type="config.importRef.url ? 'url' : 'text'"
                :placeholder="config.importRef.placeholder"
              />
            </FormField>
            <FormField :label="config.importRef.remarksLabel">
              <Textarea v-model="fields.importRemarks" :rows="3" />
            </FormField>
          </template>
          <template v-if="config.initialResult && mode === 'create'">
            <FormField
              label="First result"
              hint="Results hold the findings and observations; you can add more later."
              required
              :error="errors.resultTitle"
            >
              <TextInput
                v-model="fields.resultTitle"
                placeholder="Initial assessment result"
              />
            </FormField>
            <FormField label="What the first result covers">
              <Textarea v-model="fields.resultDescription" :rows="3" />
            </FormField>
          </template>
          <InlineMessage
            v-if="saveError"
            tone="error"
            :title="mode === 'create' ? 'Not created' : 'Not saved'"
          >
            <p>{{ saveError }}</p>
          </InlineMessage>
          <Cluster justify="end" gap="2">
            <Button :to="back.to">Cancel</Button>
            <Button
              variant="primary"
              type="submit"
              :loading="saving"
              :disabled-reason="denied"
              >{{
                mode === 'create' ? `Create ${config.noun}` : 'Save changes'
              }}</Button
            >
          </Cluster>
        </Stack>
      </form>
    </Panel>
  </Stack>
</template>
