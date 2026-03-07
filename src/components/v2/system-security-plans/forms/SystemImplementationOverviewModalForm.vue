<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import DangerButton from '@/volt/DangerButton.vue';
import Textarea from '@/volt/Textarea.vue';
import InputText from '@/volt/InputText.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import type { Link, Property, SystemImplementation } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { toErrorSummaryItems } from '@/composables/v2/useV2FormValidation';
import V2FormField from '@/components/v2/forms/V2FormField.vue';
import V2EditorDrawer from '@/components/v2/patterns/V2EditorDrawer.vue';
import V2EditorFormTemplate from '@/components/v2/patterns/V2EditorFormTemplate.vue';
import SspEditorSection from '@/components/v2/system-security-plans/forms/SspEditorSection.vue';
import {
  cloneValue,
  resolveApiErrorMessage,
} from '@/views/system-security-plans-v2/editors/sspEditorHelpers';

const props = defineProps<{
  sspId: string;
  systemImplementation: SystemImplementation;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [systemImplementation: SystemImplementation];
}>();

const toast = useToast();
const formId = `system-implementation-overview-form-${crypto.randomUUID()}`;
const form = reactive<{
  users: SystemImplementation['users'];
  components: SystemImplementation['components'];
  remarks: string;
  props: Property[];
  links: Link[];
}>({
  users: [],
  components: [],
  remarks: '',
  props: [],
  links: [],
});

const {
  data: savedSystemImplementation,
  execute: saveSystemImplementation,
  isLoading: isSaving,
} = useDataApi<SystemImplementation>(
  null,
  { method: 'PUT', transformRequest: [decamelizeKeys] },
  { immediate: false },
);

const saveErrorMessage = computed(() => '');
const errorSummary = computed(() =>
  toErrorSummaryItems([{ message: saveErrorMessage.value }]).map(
    (item) => item.message,
  ),
);

watch(
  () => props.systemImplementation,
  (value) => {
    form.users = cloneValue(value.users || []);
    form.components = cloneValue(value.components || []);
    form.remarks = value.remarks || '';
    form.props = cloneValue(value.props || []);
    form.links = cloneValue(value.links || []);
  },
  { immediate: true },
);

function addProperty(): void {
  form.props.push({ name: '', value: '' });
}

function removeProperty(index: number): void {
  form.props.splice(index, 1);
}

function addLink(): void {
  form.links.push({ href: '', text: '', rel: '' });
}

function removeLink(index: number): void {
  form.links.splice(index, 1);
}

async function submit(): Promise<void> {
  try {
    await saveSystemImplementation(
      `/api/oscal/system-security-plans/${props.sspId}/system-implementation`,
      {
        data: {
          users: form.users,
          components: form.components,
          remarks: form.remarks,
          props: form.props,
          links: form.links,
        } as SystemImplementation,
      },
    );

    toast.add({
      severity: 'success',
      summary: 'Overview Saved',
      detail: 'System implementation overview updated successfully.',
      life: 2500,
    });

    emit(
      'saved',
      savedSystemImplementation.value || props.systemImplementation,
    );
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: resolveApiErrorMessage(
        error,
        'Unable to save the system implementation overview.',
      ),
      life: 4000,
    });
  }
}
</script>

<template>
  <V2EditorDrawer
    title="EDIT IMPLEMENTATION OVERVIEW"
    submit-label="SAVE OVERVIEW"
    :submitting="isSaving"
    :form-id="formId"
    @close="emit('cancel')"
  >
    <form :id="formId" class="space-y-5" @submit.prevent="submit">
      <V2EditorFormTemplate :error-summary="errorSummary">
        <SspEditorSection variant="plain" title="REMARKS">
          <V2FormField
            label="REMARKS"
            input-id="system-implementation-remarks"
            helper-text="Describe the system implementation and additional context."
          >
            <template #default="fieldProps">
              <Textarea
                v-model="form.remarks"
                :input-id="fieldProps.inputId"
                rows="5"
                fluid
              />
            </template>
          </V2FormField>
        </SspEditorSection>

        <SspEditorSection variant="plain" title="PROPERTIES">
          <div class="space-y-3">
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
                >
                  REMOVE
                </DangerButton>
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <V2FormField
                  :input-id="`implementation-property-name-${index}`"
                  label="Name"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="property.name"
                      :input-id="fieldProps.inputId"
                      fluid /></template
                ></V2FormField>
                <V2FormField
                  :input-id="`implementation-property-value-${index}`"
                  label="Value"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="property.value"
                      :input-id="fieldProps.inputId"
                      fluid /></template
                ></V2FormField>
              </div>
            </article>
            <SecondaryButton type="button" size="small" @click="addProperty">
              ADD PROPERTY
            </SecondaryButton>
          </div>
        </SspEditorSection>

        <SspEditorSection variant="plain" title="LINKS">
          <div class="space-y-3">
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
                >
                  REMOVE
                </DangerButton>
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <V2FormField
                  :input-id="`implementation-link-href-${index}`"
                  label="Href"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="link.href"
                      :input-id="fieldProps.inputId"
                      fluid /></template
                ></V2FormField>
                <V2FormField
                  :input-id="`implementation-link-text-${index}`"
                  label="Text"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="link.text"
                      :input-id="fieldProps.inputId"
                      fluid /></template
                ></V2FormField>
                <V2FormField
                  :input-id="`implementation-link-rel-${index}`"
                  label="Rel"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="link.rel"
                      :input-id="fieldProps.inputId"
                      fluid /></template
                ></V2FormField>
              </div>
            </article>
            <SecondaryButton type="button" size="small" @click="addLink">
              ADD LINK
            </SecondaryButton>
          </div>
        </SspEditorSection>
      </V2EditorFormTemplate>
    </form>
  </V2EditorDrawer>
</template>
