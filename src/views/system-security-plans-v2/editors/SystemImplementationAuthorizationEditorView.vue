<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import type { LeveragedAuthorization } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import {
  focusFirstInvalidField,
  toErrorSummaryItems,
} from '@/composables/v2/useV2FormValidation';
import V2FormField from '@/components/v2/forms/V2FormField.vue';
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';
import SspEditorFormPage, {
  type SspEditorBreadcrumbItem,
} from '@/components/v2/system-security-plans/forms/SspEditorFormPage.vue';
import SspEditorSection from '@/components/v2/system-security-plans/forms/SspEditorSection.vue';
import {
  cloneValue,
  getRouteParam,
  resolveApiErrorMessage,
  toDateInputValue,
} from './sspEditorHelpers';

const formId = 'ssp-leveraged-authorization-editor';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const sspId = computed(() => getRouteParam(route, 'id'));
const authorizationId = computed(() => getRouteParam(route, 'authorizationId'));
const isEditMode = computed(() => authorizationId.value.length > 0);

const breadcrumbs = computed<SspEditorBreadcrumbItem[]>(() => [
  {
    label: 'IMPLEMENTATION',
    to: {
      name: 'system-security-plan-system-implementation',
      params: { id: sspId.value },
      query: { section: 'authorizations' },
    },
  },
  {
    label: 'AUTHORIZATIONS',
    to: {
      name: 'system-security-plan-system-implementation',
      params: { id: sspId.value },
      query: { section: 'authorizations' },
    },
  },
  { label: isEditMode.value ? 'EDIT AUTHORIZATION' : 'CREATE AUTHORIZATION' },
]);

const backTo = computed(() => ({
  name: 'system-security-plan-system-implementation',
  params: { id: sspId.value },
  query: { section: 'authorizations' },
}));

const {
  data: authorizations,
  isLoading,
  execute: loadAuthorizations,
} = useDataApi<LeveragedAuthorization[]>(null, null, { immediate: false });

const {
  data: savedAuthorization,
  execute: persistAuthorization,
  isLoading: isSaving,
} = useDataApi<LeveragedAuthorization>(
  null,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const loadErrorMessage = ref('');
const serverErrorMessage = ref('');

const fieldErrors = reactive({
  title: '',
  partyUuid: '',
  dateAuthorized: '',
});

const form = reactive<LeveragedAuthorization>({
  uuid: '',
  title: '',
  partyUuid: '',
  dateAuthorized: '',
  remarks: '',
  props: [],
  links: [],
});

const pageTitle = computed(() =>
  isEditMode.value ? 'EDIT AUTHORIZATION' : 'CREATE AUTHORIZATION',
);
const submitLabel = computed(() =>
  isEditMode.value ? 'SAVE AUTHORIZATION' : 'CREATE AUTHORIZATION',
);

const errorSummary = computed(() =>
  toErrorSummaryItems([
    { fieldId: 'leveraged-auth-title', message: fieldErrors.title },
    {
      fieldId: 'leveraged-auth-party-uuid',
      message: fieldErrors.partyUuid,
    },
    {
      fieldId: 'leveraged-auth-date-authorized',
      message: fieldErrors.dateAuthorized,
    },
    { message: serverErrorMessage.value },
  ]),
);

watch(
  [sspId, authorizationId],
  async ([nextSspId, nextAuthorizationId]) => {
    resetErrors();
    resetForm();

    if (!nextSspId) {
      return;
    }

    if (!nextAuthorizationId) {
      form.uuid = crypto.randomUUID();
      loadErrorMessage.value = '';
      return;
    }

    loadErrorMessage.value = '';

    try {
      await loadAuthorizations(
        `/api/oscal/system-security-plans/${nextSspId}/system-implementation/leveraged-authorizations`,
      );

      const currentAuthorization = (authorizations.value || []).find(
        (candidate) => candidate.uuid === nextAuthorizationId,
      );

      if (!currentAuthorization) {
        throw new Error('The requested leveraged authorization was not found.');
      }

      loadForm(currentAuthorization);
    } catch (error) {
      loadErrorMessage.value = resolveApiErrorMessage(
        error,
        'Unable to load this leveraged authorization.',
      );
    }
  },
  { immediate: true },
);

function resetForm(): void {
  form.uuid = '';
  form.title = '';
  form.partyUuid = '';
  form.dateAuthorized = '';
  form.remarks = '';
  form.props = [];
  form.links = [];
}

function loadForm(value: LeveragedAuthorization): void {
  form.uuid = value.uuid;
  form.title = value.title || '';
  form.partyUuid = value.partyUuid || '';
  form.dateAuthorized = toDateInputValue(value.dateAuthorized);
  form.remarks = value.remarks || '';
  form.props = cloneValue(value.props || []);
  form.links = cloneValue(value.links || []);
}

function resetErrors(): void {
  fieldErrors.title = '';
  fieldErrors.partyUuid = '';
  fieldErrors.dateAuthorized = '';
  serverErrorMessage.value = '';
}

function addProperty(): void {
  form.props = form.props || [];
  form.props.push({
    name: '',
    value: '',
  });
}

function removeProperty(index: number): void {
  form.props = form.props || [];
  form.props.splice(index, 1);
}

function addLink(): void {
  form.links = form.links || [];
  form.links.push({
    href: '',
    text: '',
    rel: '',
  });
}

function removeLink(index: number): void {
  form.links = form.links || [];
  form.links.splice(index, 1);
}

function validateForm(): boolean {
  resetErrors();

  if (!form.title.trim()) {
    fieldErrors.title = 'Title is required.';
  }
  if (!form.partyUuid.trim()) {
    fieldErrors.partyUuid = 'Party UUID is required.';
  }
  if (!form.dateAuthorized.trim()) {
    fieldErrors.dateAuthorized = 'Date authorized is required.';
  }

  const isValid =
    !fieldErrors.title && !fieldErrors.partyUuid && !fieldErrors.dateAuthorized;

  if (!isValid) {
    focusFirstInvalidField(document.getElementById(formId) || document);
  }

  return isValid;
}

async function handleSubmit(): Promise<void> {
  if (!validateForm()) {
    return;
  }

  const method = isEditMode.value ? 'PUT' : 'POST';
  const url = isEditMode.value
    ? `/api/oscal/system-security-plans/${sspId.value}/system-implementation/leveraged-authorizations/${authorizationId.value}`
    : `/api/oscal/system-security-plans/${sspId.value}/system-implementation/leveraged-authorizations`;

  try {
    await persistAuthorization(url, {
      method,
      data: form,
    });

    toast.add({
      severity: 'success',
      summary: isEditMode.value
        ? 'Authorization Saved'
        : 'Authorization Created',
      detail: isEditMode.value
        ? 'Leveraged authorization updated successfully.'
        : 'Leveraged authorization created successfully.',
      life: 2500,
    });

    if (savedAuthorization.value) {
      loadForm(savedAuthorization.value);
    }

    await router.push(backTo.value);
  } catch (error) {
    serverErrorMessage.value = resolveApiErrorMessage(
      error,
      isEditMode.value
        ? 'Unable to update this leveraged authorization.'
        : 'Unable to create this leveraged authorization.',
    );

    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: serverErrorMessage.value,
      life: 4000,
    });
  }
}
</script>

<template>
  <div class="space-y-6">
    <V2StatePanel
      v-if="isEditMode && isLoading && !authorizations"
      kind="loading"
      title="Loading"
      description="Loading the selected leveraged authorization..."
    />

    <V2StatePanel
      v-else-if="loadErrorMessage"
      kind="error"
      title="Load failed"
      :description="loadErrorMessage"
    >
      <template #actions>
        <RouterLink
          :to="backTo"
          class="ui-v2-nav inline-flex h-10 items-center justify-center border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-4 font-bold text-[var(--ui-v2-foreground)]"
        >
          BACK
        </RouterLink>
      </template>
    </V2StatePanel>

    <SspEditorFormPage
      v-else
      :breadcrumbs="breadcrumbs"
      :title="pageTitle"
      :form-id="formId"
      :back-to="backTo"
      :submit-label="submitLabel"
      :submitting="isSaving"
      :errors="errorSummary"
      @submit="handleSubmit"
    >
      <SspEditorSection title="BASICS">
        <div class="grid gap-4 lg:grid-cols-2">
          <V2FormField label="UUID" input-id="leveraged-auth-uuid">
            <template #default="fieldProps">
              <InputText
                :model-value="isEditMode ? form.uuid : 'Auto-generated'"
                :input-id="fieldProps.inputId"
                readonly
                fluid
              />
            </template>
          </V2FormField>

          <V2FormField
            label="TITLE"
            input-id="leveraged-auth-title"
            required
            :error="fieldErrors.title"
          >
            <template #default="fieldProps">
              <InputText
                v-model="form.title"
                :input-id="fieldProps.inputId"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                fluid
              />
            </template>
          </V2FormField>

          <V2FormField
            label="PARTY UUID"
            input-id="leveraged-auth-party-uuid"
            required
            :error="fieldErrors.partyUuid"
          >
            <template #default="fieldProps">
              <InputText
                v-model="form.partyUuid"
                :input-id="fieldProps.inputId"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                fluid
              />
            </template>
          </V2FormField>

          <V2FormField
            label="DATE AUTHORIZED"
            input-id="leveraged-auth-date-authorized"
            required
            :error="fieldErrors.dateAuthorized"
          >
            <template #default="fieldProps">
              <input
                :id="fieldProps.inputId"
                v-model="form.dateAuthorized"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                type="date"
                class="h-10 w-full border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 text-[var(--ui-v2-foreground)]"
              />
            </template>
          </V2FormField>
        </div>

        <V2FormField label="REMARKS" input-id="leveraged-auth-remarks">
          <template #default="fieldProps">
            <Textarea
              v-model="form.remarks"
              :input-id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              rows="4"
              fluid
            />
          </template>
        </V2FormField>
      </SspEditorSection>

      <SspEditorSection title="PROPERTIES">
        <div class="space-y-3">
          <article
            v-for="(property, index) in form.props"
            :key="`property-${index}`"
            class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <div class="flex justify-end">
              <button
                type="button"
                class="ui-v2-nav inline-flex h-8 items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-3 font-bold text-[var(--ui-v2-error)]"
                @click="removeProperty(index)"
              >
                REMOVE
              </button>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <V2FormField
                :input-id="`auth-property-name-${index}`"
                label="Name"
              >
                <template #default="fieldProps">
                  <InputText
                    v-model="property.name"
                    :input-id="fieldProps.inputId"
                    :aria-describedby="fieldProps.describedBy"
                    :aria-invalid="fieldProps.invalid"
                    fluid
                  />
                </template>
              </V2FormField>

              <V2FormField
                :input-id="`auth-property-value-${index}`"
                label="Value"
              >
                <template #default="fieldProps">
                  <InputText
                    v-model="property.value"
                    :input-id="fieldProps.inputId"
                    :aria-describedby="fieldProps.describedBy"
                    :aria-invalid="fieldProps.invalid"
                    fluid
                  />
                </template>
              </V2FormField>
            </div>
          </article>

          <button
            type="button"
            class="ui-v2-nav inline-flex h-9 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] px-3 font-bold text-[var(--ui-v2-primary)]"
            @click="addProperty"
          >
            ADD PROPERTY
          </button>
        </div>
      </SspEditorSection>

      <SspEditorSection title="LINKS">
        <div class="space-y-3">
          <article
            v-for="(link, index) in form.links"
            :key="`link-${index}`"
            class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3"
          >
            <div class="flex justify-end">
              <button
                type="button"
                class="ui-v2-nav inline-flex h-8 items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-3 font-bold text-[var(--ui-v2-error)]"
                @click="removeLink(index)"
              >
                REMOVE
              </button>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <V2FormField :input-id="`auth-link-href-${index}`" label="Href">
                <template #default="fieldProps">
                  <InputText
                    v-model="link.href"
                    :input-id="fieldProps.inputId"
                    :aria-describedby="fieldProps.describedBy"
                    :aria-invalid="fieldProps.invalid"
                    fluid
                  />
                </template>
              </V2FormField>

              <V2FormField :input-id="`auth-link-text-${index}`" label="Text">
                <template #default="fieldProps">
                  <InputText
                    v-model="link.text"
                    :input-id="fieldProps.inputId"
                    :aria-describedby="fieldProps.describedBy"
                    :aria-invalid="fieldProps.invalid"
                    fluid
                  />
                </template>
              </V2FormField>

              <V2FormField :input-id="`auth-link-rel-${index}`" label="Rel">
                <template #default="fieldProps">
                  <InputText
                    v-model="link.rel"
                    :input-id="fieldProps.inputId"
                    :aria-describedby="fieldProps.describedBy"
                    :aria-invalid="fieldProps.invalid"
                    fluid
                  />
                </template>
              </V2FormField>
            </div>
          </article>

          <button
            type="button"
            class="ui-v2-nav inline-flex h-9 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] px-3 font-bold text-[var(--ui-v2-primary)]"
            @click="addLink"
          >
            ADD LINK
          </button>
        </div>
      </SspEditorSection>
    </SspEditorFormPage>
  </div>
</template>
