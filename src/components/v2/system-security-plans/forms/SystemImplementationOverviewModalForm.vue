<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import Textarea from '@/volt/Textarea.vue';
import InputText from '@/volt/InputText.vue';
import type { Link, Property, SystemImplementation } from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { toErrorSummaryItems } from '@/composables/v2/useV2FormValidation';
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
    description="Update the shared implementation narrative, supporting properties, and reference links."
    submit-mode="save"
    :submitting="isSaving"
    :form-id="formId"
    @close="emit('cancel')"
  >
    <form :id="formId" class="space-y-4" @submit.prevent="submit">
      <V2EditorFormTemplate
        :error-summary="errorSummary"
        footer-note="Changes remain scoped to the active system security plan until you save."
      >
        <SspEditorSection
          variant="plain"
          title="REMARKS *"
          description="Describe the system implementation and additional context."
        >
          <V2FormField
            label="REMARKS"
            input-id="system-implementation-remarks"
            :show-label="false"
          >
            <template #default="fieldProps">
              <Textarea
                v-model="form.remarks"
                :input-id="fieldProps.inputId"
                class="h-[140px] min-h-[140px] resize-none"
                placeholder="Describe the system implementation and any additional remarks..."
                rows="5"
                fluid
              />
            </template>
          </V2FormField>
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
                :input-id="`implementation-property-name-${index}`"
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
                :input-id="`implementation-property-value-${index}`"
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
              No properties defined.
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
                  :input-id="`implementation-link-href-${index}`"
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
                  :input-id="`implementation-link-rel-${index}`"
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
                :input-id="`implementation-link-text-${index}`"
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
              No links defined.
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
