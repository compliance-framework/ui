<template>
  <div
    class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
  >
    <div>
      <PageHeader>New Control Link</PageHeader>
      <PageSubHeader
        >Relate one control — or a whole catalog — to a control</PageSubHeader
      >
    </div>
    <SecondaryButton type="button" @click="cancel">Cancel</SecondaryButton>
  </div>

  <PageCard class="mt-8 w-full max-w-3xl">
    <form @submit.prevent="submit" class="space-y-8">
      <!-- Link scope -->
      <div>
        <Label>Link scope</Label>
        <SelectButton
          v-model="scope"
          :options="scopeOptions"
          optionLabel="label"
          optionValue="value"
          :allowEmpty="false"
          class="mt-1"
          @change="onScopeChange"
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-slate-400">
          {{
            scope === 'catalog'
              ? 'Links every control in the source catalog to the target control (one relationship, fanned out).'
              : 'Links a single source control to the target control.'
          }}
        </p>
      </div>

      <!-- Source -->
      <fieldset class="space-y-4">
        <legend class="text-sm font-semibold text-gray-900 dark:text-slate-200">
          {{ scope === 'catalog' ? 'Source catalog' : 'Source control' }}
          <span class="font-normal text-gray-500 dark:text-slate-400">
            — the concrete side that implements / documents the target
          </span>
        </legend>
        <div>
          <Label for="source-catalog" required>Catalog</Label>
          <Select
            id="source-catalog"
            v-model="form.sourceCatalogId"
            :options="catalogs ?? []"
            optionLabel="metadata.title"
            optionValue="uuid"
            placeholder="Select a catalog"
            class="w-full"
            filter
            :invalid="!!errors.sourceCatalogId"
            @change="form.sourceControlId = null"
          />
          <small v-if="errors.sourceCatalogId" class="text-red-500">
            {{ errors.sourceCatalogId }}
          </small>
        </div>
        <div v-if="scope === 'control' && form.sourceCatalogId">
          <Label for="source-control" required>Control</Label>
          <Select
            id="source-control"
            v-model="form.sourceControlId"
            :options="sourceControls"
            optionLabel="label"
            optionValue="value"
            placeholder="Search controls…"
            class="w-full"
            filter
            :filterFields="['label', 'value']"
            :loading="sourceLoading"
            :invalid="!!errors.sourceControlId"
          />
          <small v-if="errors.sourceControlId" class="text-red-500">
            {{ errors.sourceControlId }}
          </small>
        </div>
        <p
          v-else-if="scope === 'catalog' && form.sourceCatalogId"
          class="text-xs text-gray-500 dark:text-slate-400"
        >
          <template v-if="sourceLoading">Counting controls…</template>
          <template v-else>
            {{ sourceControls.length }} control{{
              sourceControls.length === 1 ? '' : 's'
            }}
            will be linked.
          </template>
        </p>
      </fieldset>

      <!-- Relationship -->
      <div>
        <Label for="relationship" required>Relationship</Label>
        <Select
          id="relationship"
          v-model="form.relationshipType"
          :options="RELATIONSHIP_OPTIONS"
          optionLabel="label"
          optionValue="value"
          placeholder="Select a relationship"
          class="w-full"
          :invalid="!!errors.relationshipType"
        />
        <small v-if="errors.relationshipType" class="text-red-500">
          {{ errors.relationshipType }}
        </small>
        <p
          v-if="selectedRelationship"
          class="mt-1 text-xs text-gray-500 dark:text-slate-400"
        >
          Allowed direction: {{ selectedRelationship.hint }}
        </p>
      </div>

      <!-- Target -->
      <fieldset class="space-y-4">
        <legend class="text-sm font-semibold text-gray-900 dark:text-slate-200">
          Target control
          <span class="font-normal text-gray-500 dark:text-slate-400">
            — the abstract control being implemented / documented
          </span>
        </legend>
        <div>
          <Label for="target-catalog" required>Catalog</Label>
          <Select
            id="target-catalog"
            v-model="form.targetCatalogId"
            :options="catalogs ?? []"
            optionLabel="metadata.title"
            optionValue="uuid"
            placeholder="Select a catalog"
            class="w-full"
            filter
            :invalid="!!errors.targetCatalogId"
            @change="form.targetControlId = null"
          />
          <small v-if="errors.targetCatalogId" class="text-red-500">
            {{ errors.targetCatalogId }}
          </small>
        </div>
        <div v-if="form.targetCatalogId">
          <Label for="target-control" required>Control</Label>
          <Select
            id="target-control"
            v-model="form.targetControlId"
            :options="targetControls"
            optionLabel="label"
            optionValue="value"
            placeholder="Search controls…"
            class="w-full"
            filter
            :filterFields="['label', 'value']"
            :loading="targetLoading"
            :invalid="!!errors.targetControlId"
          />
          <small v-if="errors.targetControlId" class="text-red-500">
            {{ errors.targetControlId }}
          </small>
        </div>
      </fieldset>

      <Message v-if="errorMessage" severity="error">
        {{ errorMessage }}
      </Message>

      <div
        class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700"
      >
        <SecondaryButton type="button" @click="cancel">Cancel</SecondaryButton>
        <PrimaryButton
          type="submit"
          :disabled="
            isSubmitting || !can(RESOURCES.CONTROL_LINK, ACTIONS.CREATE)
          "
          v-tooltip.top="{
            value: permissionTooltip(RESOURCES.CONTROL_LINK, ACTIONS.CREATE),
            disabled: can(RESOURCES.CONTROL_LINK, ACTIONS.CREATE),
          }"
        >
          <i v-if="isSubmitting" class="pi pi-spin pi-spinner mr-2"></i>
          {{ scope === 'catalog' ? 'Link Catalog' : 'Create Control Link' }}
        </PrimaryButton>
      </div>
    </form>
  </PageCard>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import PageSubHeader from '@/components/PageSubHeader.vue';
import PageCard from '@/components/PageCard.vue';
import Label from '@/volt/Label.vue';
import Select from '@/volt/Select.vue';
import SelectButton from '@/volt/SelectButton.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { useToast } from 'primevue/usetoast';
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

const { can, permissionTooltip } = usePermissions();
const router = useRouter();
const toast = useToast();

type LinkScope = 'control' | 'catalog';
const scope = ref<LinkScope>('control');
const scopeOptions = [
  { label: 'Single control', value: 'control' },
  { label: 'Whole catalog', value: 'catalog' },
];

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
    errors.sourceCatalogId = 'Source catalog is required';
  if (scope.value === 'control' && !form.sourceControlId)
    errors.sourceControlId = 'Source control is required';
  if (!form.relationshipType)
    errors.relationshipType = 'Relationship is required';
  if (!form.targetCatalogId)
    errors.targetCatalogId = 'Target catalog is required';
  if (!form.targetControlId)
    errors.targetControlId = 'Target control is required';

  if (
    scope.value === 'control' &&
    form.sourceCatalogId &&
    form.sourceControlId &&
    form.sourceCatalogId === form.targetCatalogId &&
    form.sourceControlId === form.targetControlId
  ) {
    errors.targetControlId = 'Source and target cannot be the same control';
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
</script>
