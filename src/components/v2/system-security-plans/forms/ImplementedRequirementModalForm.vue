<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import type { ImplementedRequirement } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { focusFirstInvalidField } from '@/composables/v2/useV2FormValidation';
import V2FormField from '@/components/v2/forms/V2FormField.vue';
import V2EditorDrawer from '@/components/v2/patterns/V2EditorDrawer.vue';
import V2EditorFormTemplate from '@/components/v2/patterns/V2EditorFormTemplate.vue';
import SspEditorAddButton from '@/components/v2/system-security-plans/forms/SspEditorAddButton.vue';
import SspEditorCollectionSection from '@/components/v2/system-security-plans/forms/SspEditorCollectionSection.vue';
import SspEditorCompactField from '@/components/v2/system-security-plans/forms/SspEditorCompactField.vue';
import SspEditorRemoveButton from '@/components/v2/system-security-plans/forms/SspEditorRemoveButton.vue';
import {
  cloneValue,
  resolveApiErrorMessage,
} from '@/views/system-security-plans-v2/editors/sspEditorHelpers';

const props = defineProps<{
  sspId: string;
  requirement?: ImplementedRequirement | null;
}>();

const emit = defineEmits<{
  cancel: [];
  created: [requirement: ImplementedRequirement];
  saved: [requirement: ImplementedRequirement];
}>();

const toast = useToast();
const formId = `implemented-requirement-form-${crypto.randomUUID()}`;

const isEditMode = computed(() => Boolean(props.requirement));

const form = reactive<ImplementedRequirement>({
  uuid: '',
  controlId: '',
  props: [],
  links: [],
  remarks: '',
  statements: [],
  byComponents: [],
  setParameters: [],
  responsibleRoles: [],
});

const fieldErrors = reactive({
  controlId: '',
  server: '',
});

const {
  data: persistedRequirement,
  execute: persistRequirement,
  isLoading: saving,
} = useDataApi<ImplementedRequirement>(
  null,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const errorSummary = computed(() =>
  [fieldErrors.controlId, fieldErrors.server].filter(Boolean),
);

watch(
  () => props.requirement,
  (value) => {
    resetErrors();

    if (value) {
      Object.assign(form, cloneValue(value));
      form.props = cloneValue(value.props || []);
      form.links = cloneValue(value.links || []);
      return;
    }

    resetForm();
  },
  { immediate: true },
);

function resetForm(): void {
  form.uuid = crypto.randomUUID();
  form.controlId = '';
  form.props = [];
  form.links = [];
  form.remarks = '';
  form.statements = [];
  form.byComponents = [];
  form.setParameters = [];
  form.responsibleRoles = [];
}

function resetErrors(): void {
  fieldErrors.controlId = '';
  fieldErrors.server = '';
}

function addProperty(): void {
  form.props = form.props || [];
  form.props.push({ uuid: crypto.randomUUID(), name: '', value: '' });
}

function removeProperty(index: number): void {
  form.props = form.props || [];
  form.props.splice(index, 1);
}

function addLink(): void {
  form.links = form.links || [];
  form.links.push({ href: '', rel: '', text: '' });
}

function removeLink(index: number): void {
  form.links = form.links || [];
  form.links.splice(index, 1);
}

function validate(): boolean {
  resetErrors();

  if (!form.controlId.trim()) {
    fieldErrors.controlId = 'Control ID is required.';
  }

  const valid = !fieldErrors.controlId;
  if (!valid) {
    focusFirstInvalidField(document.getElementById(formId) || document);
  }

  return valid;
}

async function submit(): Promise<void> {
  if (!validate()) {
    return;
  }

  const url = isEditMode.value
    ? `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${form.uuid}`
    : `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements`;

  try {
    await persistRequirement(url, {
      method: isEditMode.value ? 'PUT' : 'POST',
      data: form,
    });

    const result = persistedRequirement.value!;
    toast.add({
      severity: 'success',
      summary: isEditMode.value ? 'Requirement Saved' : 'Requirement Created',
      detail: isEditMode.value
        ? 'Implemented requirement updated successfully.'
        : 'Implemented requirement created successfully.',
      life: 2500,
    });

    if (isEditMode.value) {
      emit('saved', result);
      return;
    }

    emit('created', result);
  } catch (error) {
    fieldErrors.server = resolveApiErrorMessage(
      error,
      isEditMode.value
        ? 'Unable to update implemented requirement.'
        : 'Unable to create implemented requirement.',
    );
  }
}
</script>

<template>
  <V2EditorDrawer
    :title="
      isEditMode
        ? 'EDIT IMPLEMENTED REQUIREMENT'
        : 'CREATE IMPLEMENTED REQUIREMENT'
    "
    description="Edit requirement-level remarks, properties, and traceability details."
    :submit-mode="isEditMode ? 'save' : 'create'"
    :submitting="saving"
    :form-id="formId"
    width-class="w-screen! sm:w-[94vw]! lg:w-[760px]!"
    @close="emit('cancel')"
  >
    <form :id="formId" class="space-y-4" @submit.prevent="submit">
      <V2EditorFormTemplate :error-summary="errorSummary">
        <div class="grid gap-4 md:grid-cols-2">
          <V2FormField label="UUID" input-id="implemented-requirement-uuid">
            <template #default="fieldProps">
              <InputText
                :model-value="form.uuid"
                :input-id="fieldProps.inputId"
                readonly
                fluid
              />
            </template>
          </V2FormField>

          <V2FormField
            label="CONTROL ID"
            input-id="implemented-requirement-control-id"
            required
            :error="fieldErrors.controlId"
          >
            <template #default="fieldProps">
              <InputText
                v-model="form.controlId"
                :input-id="fieldProps.inputId"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                fluid
              />
            </template>
          </V2FormField>
        </div>

        <V2FormField label="REMARKS" input-id="implemented-requirement-remarks">
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

        <SspEditorCollectionSection title="PROPERTIES">
          <div
            v-if="form.props?.length"
            class="divide-y divide-[var(--ui-v2-border)]"
          >
            <article
              v-for="(property, index) in form.props"
              :key="property.uuid || `property-${index}`"
              class="grid gap-3 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start"
            >
              <SspEditorCompactField
                :input-id="`implemented-requirement-property-name-${index}`"
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
                :input-id="`implemented-requirement-property-value-${index}`"
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
                  :input-id="`implemented-requirement-link-href-${index}`"
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
                  :input-id="`implemented-requirement-link-rel-${index}`"
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
                :input-id="`implemented-requirement-link-text-${index}`"
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
