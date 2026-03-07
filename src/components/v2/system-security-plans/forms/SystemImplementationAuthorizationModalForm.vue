<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import DangerButton from '@/volt/DangerButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Textarea from '@/volt/Textarea.vue';
import type { LeveragedAuthorization } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import {
  focusFirstInvalidField,
  toErrorSummaryItems,
} from '@/composables/v2/useV2FormValidation';
import V2FormField from '@/components/v2/forms/V2FormField.vue';
import V2EditorDrawer from '@/components/v2/patterns/V2EditorDrawer.vue';
import V2EditorFormTemplate from '@/components/v2/patterns/V2EditorFormTemplate.vue';
import SspEditorSection from '@/components/v2/system-security-plans/forms/SspEditorSection.vue';
import {
  cloneValue,
  resolveApiErrorMessage,
  toDateInputValue,
} from '@/views/system-security-plans-v2/editors/sspEditorHelpers';

const props = defineProps<{
  sspId: string;
  authorization?: LeveragedAuthorization | null;
}>();
const emit = defineEmits<{
  cancel: [];
  created: [authorization: LeveragedAuthorization];
  saved: [authorization: LeveragedAuthorization];
}>();

const toast = useToast();
const formId = `system-implementation-authorization-form-${crypto.randomUUID()}`;
const isEditMode = computed(() => Boolean(props.authorization));
const fieldErrors = reactive({
  title: '',
  partyUuid: '',
  dateAuthorized: '',
  server: '',
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

const {
  data: persistedAuthorization,
  execute: persistAuthorization,
  isLoading: saving,
} = useDataApi<LeveragedAuthorization>(
  null,
  { method: 'POST', transformRequest: [decamelizeKeys] },
  { immediate: false },
);

const errorSummary = computed(() =>
  toErrorSummaryItems([
    { fieldId: 'authorization-title', message: fieldErrors.title },
    { fieldId: 'authorization-party-uuid', message: fieldErrors.partyUuid },
    {
      fieldId: 'authorization-date-authorized',
      message: fieldErrors.dateAuthorized,
    },
    { message: fieldErrors.server },
  ]).map((item) => item.message),
);

watch(
  () => props.authorization,
  (value) => {
    resetErrors();
    if (value) {
      form.uuid = value.uuid;
      form.title = value.title || '';
      form.partyUuid = value.partyUuid || '';
      form.dateAuthorized = toDateInputValue(value.dateAuthorized);
      form.remarks = value.remarks || '';
      form.props = cloneValue(value.props || []);
      form.links = cloneValue(value.links || []);
      return;
    }

    form.uuid = crypto.randomUUID();
    form.title = '';
    form.partyUuid = '';
    form.dateAuthorized = '';
    form.remarks = '';
    form.props = [];
    form.links = [];
  },
  { immediate: true },
);

function resetErrors(): void {
  fieldErrors.title = '';
  fieldErrors.partyUuid = '';
  fieldErrors.dateAuthorized = '';
  fieldErrors.server = '';
}

function addProperty(): void {
  (form.props ||= []).push({ name: '', value: '' });
}
function removeProperty(index: number): void {
  (form.props ||= []).splice(index, 1);
}
function addLink(): void {
  (form.links ||= []).push({ href: '', text: '', rel: '' });
}
function removeLink(index: number): void {
  (form.links ||= []).splice(index, 1);
}

function validate(): boolean {
  resetErrors();
  if (!form.title.trim()) fieldErrors.title = 'Title is required.';
  if (!form.partyUuid.trim()) fieldErrors.partyUuid = 'Party UUID is required.';
  if (!form.dateAuthorized.trim())
    fieldErrors.dateAuthorized = 'Date authorized is required.';
  const valid =
    !fieldErrors.title && !fieldErrors.partyUuid && !fieldErrors.dateAuthorized;
  if (!valid)
    focusFirstInvalidField(document.getElementById(formId) || document);
  return valid;
}

async function submit(): Promise<void> {
  if (!validate()) return;
  try {
    await persistAuthorization(
      isEditMode.value
        ? `/api/oscal/system-security-plans/${props.sspId}/system-implementation/leveraged-authorizations/${form.uuid}`
        : `/api/oscal/system-security-plans/${props.sspId}/system-implementation/leveraged-authorizations`,
      { method: isEditMode.value ? 'PUT' : 'POST', data: form },
    );
    const result = persistedAuthorization.value!;
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
    if (isEditMode.value) emit('saved', result);
    else emit('created', result);
  } catch (error) {
    fieldErrors.server = resolveApiErrorMessage(
      error,
      isEditMode.value
        ? 'Unable to update this leveraged authorization.'
        : 'Unable to create this leveraged authorization.',
    );
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: fieldErrors.server,
      life: 4000,
    });
  }
}
</script>

<template>
  <V2EditorDrawer
    :title="isEditMode ? 'EDIT AUTHORIZATION' : 'CREATE AUTHORIZATION'"
    :form-id="formId"
    :submit-label="isEditMode ? 'SAVE AUTHORIZATION' : 'CREATE AUTHORIZATION'"
    :submitting="saving"
    @close="emit('cancel')"
  >
    <form :id="formId" class="space-y-5" @submit.prevent="submit">
      <V2EditorFormTemplate :error-summary="errorSummary">
        <SspEditorSection variant="plain" title="BASICS">
          <div class="grid gap-4 lg:grid-cols-2">
            <V2FormField label="UUID" input-id="authorization-uuid"
              ><template #default="fieldProps"
                ><InputText
                  :model-value="isEditMode ? form.uuid : 'Auto-generated'"
                  :input-id="fieldProps.inputId"
                  readonly
                  fluid /></template
            ></V2FormField>
            <V2FormField
              label="TITLE"
              input-id="authorization-title"
              required
              :error="fieldErrors.title"
              ><template #default="fieldProps"
                ><InputText
                  v-model="form.title"
                  :input-id="fieldProps.inputId"
                  fluid /></template
            ></V2FormField>
            <V2FormField
              label="PARTY UUID"
              input-id="authorization-party-uuid"
              required
              :error="fieldErrors.partyUuid"
              ><template #default="fieldProps"
                ><InputText
                  v-model="form.partyUuid"
                  :input-id="fieldProps.inputId"
                  fluid /></template
            ></V2FormField>
            <V2FormField
              label="DATE AUTHORIZED"
              input-id="authorization-date-authorized"
              required
              :error="fieldErrors.dateAuthorized"
              ><template #default="fieldProps"
                ><input
                  :id="fieldProps.inputId"
                  v-model="form.dateAuthorized"
                  type="date"
                  class="ui-v2-body h-10 w-full border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 text-[var(--ui-v2-foreground)]" /></template
            ></V2FormField>
          </div>
          <V2FormField label="REMARKS" input-id="authorization-remarks"
            ><template #default="fieldProps"
              ><Textarea
                v-model="form.remarks"
                :input-id="fieldProps.inputId"
                rows="4"
                fluid /></template
          ></V2FormField>
        </SspEditorSection>
        <SspEditorSection variant="plain" title="PROPERTIES"
          ><div class="space-y-3">
            <article
              v-for="(property, index) in form.props"
              :key="`property-${index}`"
              class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
            >
              <div class="flex justify-end">
                <DangerButton
                  type="button"
                  size="small"
                  @click="removeProperty(index)"
                  >REMOVE</DangerButton
                >
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <V2FormField
                  :input-id="`auth-property-name-${index}`"
                  label="Name"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="property.name"
                      :input-id="fieldProps.inputId"
                      fluid /></template></V2FormField
                ><V2FormField
                  :input-id="`auth-property-value-${index}`"
                  label="Value"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="property.value"
                      :input-id="fieldProps.inputId"
                      fluid /></template
                ></V2FormField>
              </div>
            </article>
            <SecondaryButton type="button" size="small" @click="addProperty"
              >ADD PROPERTY</SecondaryButton
            >
          </div></SspEditorSection
        >
        <SspEditorSection variant="plain" title="LINKS"
          ><div class="space-y-3">
            <article
              v-for="(link, index) in form.links"
              :key="`link-${index}`"
              class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
            >
              <div class="flex justify-end">
                <DangerButton
                  type="button"
                  size="small"
                  @click="removeLink(index)"
                  >REMOVE</DangerButton
                >
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <V2FormField :input-id="`auth-link-href-${index}`" label="Href"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="link.href"
                      :input-id="fieldProps.inputId"
                      fluid /></template></V2FormField
                ><V2FormField :input-id="`auth-link-text-${index}`" label="Text"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="link.text"
                      :input-id="fieldProps.inputId"
                      fluid /></template></V2FormField
                ><V2FormField :input-id="`auth-link-rel-${index}`" label="Rel"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="link.rel"
                      :input-id="fieldProps.inputId"
                      fluid /></template
                ></V2FormField>
              </div>
            </article>
            <SecondaryButton type="button" size="small" @click="addLink"
              >ADD LINK</SecondaryButton
            >
          </div></SspEditorSection
        >
      </V2EditorFormTemplate>
    </form>
  </V2EditorDrawer>
</template>
