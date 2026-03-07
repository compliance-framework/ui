<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
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
import V2EditorDrawer from '@/components/v2/patterns/V2EditorDrawer.vue';
import V2EditorFormTemplate from '@/components/v2/patterns/V2EditorFormTemplate.vue';
import SspEditorAddButton from '@/components/v2/system-security-plans/forms/SspEditorAddButton.vue';
import SspEditorCollectionSection from '@/components/v2/system-security-plans/forms/SspEditorCollectionSection.vue';
import SspEditorCompactField from '@/components/v2/system-security-plans/forms/SspEditorCompactField.vue';
import SspEditorRemoveButton from '@/components/v2/system-security-plans/forms/SspEditorRemoveButton.vue';
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
    description="Capture leveraged authorization details, inherited metadata, and supporting links."
    :form-id="formId"
    :submit-mode="isEditMode ? 'save' : 'create'"
    :submitting="saving"
    width-class="w-screen! sm:w-[94vw]! lg:w-[760px]!"
    @close="emit('cancel')"
  >
    <form :id="formId" class="space-y-4" @submit.prevent="submit">
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
        <SspEditorCollectionSection title="PROPERTIES">
          <div
            v-if="form.props?.length"
            class="divide-y divide-[var(--ui-v2-border)]"
          >
            <article
              v-for="(property, index) in form.props"
              :key="`property-${index}`"
              class="grid gap-3 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start"
            >
              <SspEditorCompactField
                :input-id="`auth-property-name-${index}`"
                label="NAME"
              >
                <template #default="fieldProps">
                  <InputText
                    v-model="property.name"
                    :input-id="fieldProps.inputId"
                    fluid
                  />
                </template>
              </SspEditorCompactField>

              <SspEditorCompactField
                :input-id="`auth-property-value-${index}`"
                label="VALUE"
              >
                <template #default="fieldProps">
                  <InputText
                    v-model="property.value"
                    :input-id="fieldProps.inputId"
                    fluid
                  />
                </template>
              </SspEditorCompactField>

              <SspEditorRemoveButton @click="removeProperty(index)" />
            </article>
          </div>

          <div v-else class="px-4 py-4">
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-medium leading-[1.45] tracking-[0.3px] text-[var(--ui-v2-tertiary-foreground)]"
            >
              No properties added.
            </p>
          </div>

          <template #footer>
            <SspEditorAddButton label="ADD PROPERTY" @click="addProperty" />
          </template>
        </SspEditorCollectionSection>

        <SspEditorCollectionSection title="LINKS">
          <div
            v-if="form.links?.length"
            class="divide-y divide-[var(--ui-v2-border)]"
          >
            <article
              v-for="(link, index) in form.links"
              :key="`link-${index}`"
              class="space-y-2.5 px-3 py-2.5"
            >
              <div
                class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start"
              >
                <SspEditorCompactField
                  :input-id="`auth-link-href-${index}`"
                  label="HREF"
                >
                  <template #default="fieldProps">
                    <InputText
                      v-model="link.href"
                      :input-id="fieldProps.inputId"
                      fluid
                    />
                  </template>
                </SspEditorCompactField>

                <SspEditorCompactField
                  :input-id="`auth-link-rel-${index}`"
                  label="REL"
                >
                  <template #default="fieldProps">
                    <InputText
                      v-model="link.rel"
                      :input-id="fieldProps.inputId"
                      fluid
                    />
                  </template>
                </SspEditorCompactField>

                <SspEditorRemoveButton @click="removeLink(index)" />
              </div>

              <SspEditorCompactField
                :input-id="`auth-link-text-${index}`"
                label="TEXT"
              >
                <template #default="fieldProps">
                  <InputText
                    v-model="link.text"
                    :input-id="fieldProps.inputId"
                    fluid
                  />
                </template>
              </SspEditorCompactField>
            </article>
          </div>

          <div v-else class="px-4 py-4">
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-medium leading-[1.45] tracking-[0.3px] text-[var(--ui-v2-tertiary-foreground)]"
            >
              No links added.
            </p>
          </div>

          <template #footer>
            <SspEditorAddButton label="ADD LINK" @click="addLink" />
          </template>
        </SspEditorCollectionSection>
      </V2EditorFormTemplate>
    </form>
  </V2EditorDrawer>
</template>
