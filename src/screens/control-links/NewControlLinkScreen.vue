<script setup lang="ts">
/**
 * New control link (/control-links/new): relate one control, or every control in a catalog, to a
 * target control. Catalogs and controls are chosen with a filterable Combobox. The script is the
 * classic page's; the template and the helpers at the end are new.
 */
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import Breadcrumbs from '@/ds/components/Breadcrumbs/Breadcrumbs.vue';
import Button from '@/ds/components/Button/Button.vue';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import FormField from '@/ds/components/FormField/FormField.vue';
import InlineMessage from '@/ds/components/InlineMessage/InlineMessage.vue';
import PageHeader from '@/ds/components/PageHeader/PageHeader.vue';
import RadioGroup from '@/ds/components/RadioGroup/RadioGroup.vue';
import Select from '@/ds/components/Select/Select.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Panel from '@/ds/components/layout/Panel.vue';
import PanelSection from '@/ds/components/layout/PanelSection.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { useToast } from '@/ds/toasts';
import { useDataApi } from '@/composables/axios';
import { useControlOptions } from '@/composables/useControlOptions';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';
import {
  RELATIONSHIP_OPTIONS,
  type CatalogLinkRequest,
  type CatalogLinkResult,
  type ControlLink,
  type CreateControlLinkRequest,
} from '@/types/control-links';
import type { Catalog } from '@/oscal';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import type { AxiosError } from 'axios';

const { can } = usePermissions();
const router = useRouter();
const toast = useToast();

type LinkScope = 'control' | 'catalog';
const scope = ref<LinkScope>('control');

const form = reactive<{
  sourceCatalogId: string | null;
  sourceControlId: string | null;
  targetCatalogId: string | null;
  targetControlId: string | null;
  relationshipType: string | null;
}>({
  sourceCatalogId: null,
  sourceControlId: null,
  targetCatalogId: null,
  targetControlId: null,
  relationshipType: null,
});

const errors = reactive<Record<string, string>>({});
const errorMessage = ref('');
const isSubmitting = ref(false);

const { data: catalogs } = useDataApi<Catalog[]>('/api/oscal/catalogs');

const { options: sourceControls, loading: sourceLoading } = useControlOptions(
  () => form.sourceCatalogId,
);
const { options: targetControls, loading: targetLoading } = useControlOptions(
  () => form.targetCatalogId,
);

const selectedRelationship = computed(() =>
  RELATIONSHIP_OPTIONS.find((o) => o.value === form.relationshipType),
);

// Both control-links APIs are hand-written camelCase, so these POSTs do NOT use
// the decamelizeKeys transform the OSCAL endpoints need — bodies are sent as-is.
const { execute: createLink } = useDataApi<ControlLink>(
  '/api/control-links',
  { headers: { 'Content-Type': 'application/json' } },
  { immediate: false },
);
const { execute: createCatalogLink } = useDataApi<CatalogLinkResult>(
  '/api/control-links/catalog',
  { headers: { 'Content-Type': 'application/json' } },
  { immediate: false },
);

function onScopeChange() {
  // Source control is meaningless in catalog scope; clear it and any stale error.
  form.sourceControlId = null;
  delete errors.sourceControlId;
}

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  errorMessage.value = '';

  if (!form.sourceCatalogId)
    errors.sourceCatalogId = 'Choose the source catalog.';
  if (scope.value === 'control' && !form.sourceControlId)
    errors.sourceControlId = 'Choose the source control.';
  if (!form.relationshipType)
    errors.relationshipType = 'Choose a relationship.';
  if (!form.targetCatalogId)
    errors.targetCatalogId = 'Choose the target catalog.';
  if (!form.targetControlId)
    errors.targetControlId = 'Choose the target control.';

  if (
    scope.value === 'control' &&
    form.sourceCatalogId &&
    form.sourceControlId &&
    form.sourceCatalogId === form.targetCatalogId &&
    form.sourceControlId === form.targetControlId
  ) {
    errors.targetControlId = "A control can't be linked to itself.";
  }

  return Object.keys(errors).length === 0;
}

async function submit() {
  if (!validate()) return;
  isSubmitting.value = true;
  try {
    if (scope.value === 'catalog') {
      await submitCatalogLink();
    } else {
      await submitControlLink();
    }
    router.push({ name: 'control-links-list' });
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    errorMessage.value =
      errorResponse.response?.data?.errors?.body ||
      'An error occurred while creating the control link.';
    toast.add({
      severity: 'error',
      summary: 'Error creating control link',
      detail: errorMessage.value,
      life: 4000,
    });
  } finally {
    isSubmitting.value = false;
  }
}

async function submitControlLink() {
  const payload: CreateControlLinkRequest = {
    source: {
      catalogId: form.sourceCatalogId as string,
      controlId: form.sourceControlId as string,
    },
    target: {
      catalogId: form.targetCatalogId as string,
      controlId: form.targetControlId as string,
    },
    relationshipType: form.relationshipType as string,
  };
  await createLink({ method: 'POST', data: payload });
  toast.add({
    severity: 'success',
    summary: 'Control link created',
    detail: 'The control link was created successfully.',
    life: 3000,
  });
}

async function submitCatalogLink() {
  const payload: CatalogLinkRequest = {
    sourceCatalogId: form.sourceCatalogId as string,
    target: {
      catalogId: form.targetCatalogId as string,
      controlId: form.targetControlId as string,
    },
    relationshipType: form.relationshipType as string,
  };
  const res = await createCatalogLink({ method: 'POST', data: payload });
  const result = res.data.value?.data as CatalogLinkResult | undefined;
  const created = result?.created ?? 0;
  const skipped = result?.skipped ?? 0;
  toast.add({
    severity: 'success',
    summary: 'Catalog linked',
    detail: `Created ${created} link${created === 1 ? '' : 's'}${
      skipped ? `, skipped ${skipped} (duplicate or cycle)` : ''
    }.`,
    life: 4000,
  });
}

function cancel() {
  router.push({ name: 'control-links-list' });
}

// Design-system view ---------------------------------------------------------------------------

const catalogOptions = computed(() =>
  (catalogs.value ?? [])
    .map((c) => ({ value: c.uuid, label: c.metadata?.title ?? c.uuid }))
    .sort((a, b) => a.label.localeCompare(b.label)),
);
/** Combobox and Select bind strings; the classic form keeps null for "not chosen". */
function bind(key: keyof typeof form) {
  return computed({
    get: () => form[key] ?? '',
    set: (value: string) => {
      form[key] = value || null;
      if (key === 'sourceCatalogId') form.sourceControlId = null;
      if (key === 'targetCatalogId') form.targetControlId = null;
      delete errors[key];
    },
  });
}
const sourceCatalog = bind('sourceCatalogId');
const sourceControl = bind('sourceControlId');
const targetCatalog = bind('targetCatalogId');
const targetControl = bind('targetControlId');
const relationship = bind('relationshipType');
const scopeModel = computed({
  get: () => scope.value,
  set: (value: string) => {
    scope.value = value as LinkScope;
    onScopeChange();
  },
});
const createDenied = computed(() =>
  can(RESOURCES.CONTROL_LINK, ACTIONS.CREATE)
    ? undefined
    : "Your access doesn't include creating control links.",
);
</script>

<template>
  <Stack gap="6">
    <Breadcrumbs
      :crumbs="[{ label: 'Control links', to: { name: 'control-links-list' } }]"
    />
    <PageHeader
      title="New control link"
      description="Relate one control, or a whole catalog, to a target control."
    />
    <form novalidate @submit.prevent="submit">
      <Stack gap="5">
        <Panel>
          <PanelSection title="Scope" :level="2">
            <RadioGroup
              v-model="scopeModel"
              legend="Link"
              legend-hidden
              :options="[
                {
                  value: 'control',
                  label: 'Single control',
                  description:
                    'Links one source control to the target control.',
                },
                {
                  value: 'catalog',
                  label: 'Whole catalog',
                  description:
                    'Links every control in the source catalog to the target control.',
                },
              ]"
            />
          </PanelSection>
          <PanelSection
            :level="2"
            :title="scope === 'catalog' ? 'Source catalog' : 'Source control'"
            description="The concrete side, which implements or documents the target."
          >
            <Stack gap="4">
              <FormField
                label="Catalog"
                required
                :error="errors.sourceCatalogId"
              >
                <Combobox
                  v-model="sourceCatalog"
                  :options="catalogOptions"
                  placeholder="Type to find a catalog"
                />
              </FormField>
              <FormField
                v-if="scope === 'control' && form.sourceCatalogId"
                label="Control"
                required
                :error="errors.sourceControlId"
              >
                <Combobox
                  v-model="sourceControl"
                  :options="sourceControls"
                  :loading="sourceLoading"
                  placeholder="Type a control ID or title"
                />
              </FormField>
              <Text
                v-else-if="scope === 'catalog' && form.sourceCatalogId"
                variant="caption"
                >{{
                  sourceLoading
                    ? 'Counting controls…'
                    : `${sourceControls.length} control${sourceControls.length === 1 ? '' : 's'} will be linked.`
                }}</Text
              >
            </Stack>
          </PanelSection>
          <PanelSection title="Relationship" :level="2">
            <FormField
              label="Relationship"
              required
              :hint="
                selectedRelationship
                  ? `Allowed direction: ${selectedRelationship.hint}`
                  : undefined
              "
              :error="errors.relationshipType"
            >
              <Select
                v-model="relationship"
                placeholder="Choose a relationship"
                :options="
                  RELATIONSHIP_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))
                "
              />
            </FormField>
          </PanelSection>
          <PanelSection
            :level="2"
            title="Target control"
            description="The abstract control being implemented or documented."
          >
            <Stack gap="4">
              <FormField
                label="Catalog"
                required
                :error="errors.targetCatalogId"
              >
                <Combobox
                  v-model="targetCatalog"
                  :options="catalogOptions"
                  placeholder="Type to find a catalog"
                />
              </FormField>
              <FormField
                v-if="form.targetCatalogId"
                label="Control"
                required
                :error="errors.targetControlId"
              >
                <Combobox
                  v-model="targetControl"
                  :options="targetControls"
                  :loading="targetLoading"
                  placeholder="Type a control ID or title"
                />
              </FormField>
            </Stack>
          </PanelSection>
        </Panel>
        <InlineMessage v-if="errorMessage" tone="error" title="Not created">
          <p>{{ errorMessage }}</p>
        </InlineMessage>
        <Cluster justify="end" gap="2">
          <Button @click="cancel">Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            :loading="isSubmitting"
            :disabled-reason="createDenied"
            >{{
              scope === 'catalog' ? 'Link catalog' : 'Create control link'
            }}</Button
          >
        </Cluster>
      </Stack>
    </form>
  </Stack>
</template>
