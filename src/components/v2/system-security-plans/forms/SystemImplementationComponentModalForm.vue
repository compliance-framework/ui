<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import type { PortRange, Protocol, SystemComponent } from '@/oscal';
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
} from '@/views/system-security-plans-v2/editors/sspEditorHelpers';

const props = defineProps<{
  sspId: string;
  component?: SystemComponent | null;
}>();
const emit = defineEmits<{
  cancel: [];
  created: [component: SystemComponent];
  saved: [component: SystemComponent];
}>();
const toast = useToast();
const formId = `system-implementation-component-form-${crypto.randomUUID()}`;
const isEditMode = computed(() => Boolean(props.component));
const componentTypeOptions = [
  'this-system',
  'system',
  'interconnection',
  'software',
  'hardware',
  'service',
  'policy',
  'physical',
  'process-procedure',
  'plan',
  'guidance',
  'standard',
  'validation',
  'network',
];
const componentStatusOptions = [
  'operational',
  'under-development',
  'under-major-modification',
  'disposition',
  'other',
];
const fieldErrors = reactive({
  type: '',
  title: '',
  description: '',
  purpose: '',
  statusState: '',
  server: '',
});
const form = reactive<SystemComponent>({
  uuid: '',
  type: '',
  title: '',
  description: '',
  purpose: '',
  status: { state: '', remarks: '' },
  protocols: [],
  remarks: '',
  props: [],
  links: [],
});
const {
  data: persistedComponent,
  execute: persistComponent,
  isLoading: saving,
} = useDataApi<SystemComponent>(
  null,
  { method: 'POST', transformRequest: [decamelizeKeys] },
  { immediate: false },
);
const errorSummary = computed(() =>
  toErrorSummaryItems([
    { fieldId: 'system-component-type', message: fieldErrors.type },
    { fieldId: 'system-component-title', message: fieldErrors.title },
    {
      fieldId: 'system-component-description',
      message: fieldErrors.description,
    },
    { fieldId: 'system-component-purpose', message: fieldErrors.purpose },
    {
      fieldId: 'system-component-status-state',
      message: fieldErrors.statusState,
    },
    { message: fieldErrors.server },
  ]).map((item) => item.message),
);

watch(
  () => props.component,
  (value) => {
    Object.assign(fieldErrors, {
      type: '',
      title: '',
      description: '',
      purpose: '',
      statusState: '',
      server: '',
    });
    if (value) {
      form.uuid = value.uuid;
      form.type = value.type || '';
      form.title = value.title || '';
      form.description = value.description || '';
      form.purpose = value.purpose || '';
      form.status = cloneValue(value.status || { state: '', remarks: '' });
      form.protocols = cloneValue(value.protocols || []).map((protocol) => ({
        ...protocol,
        portRanges: cloneValue(protocol.portRanges || []),
      }));
      form.remarks = value.remarks || '';
      form.props = cloneValue(value.props || []);
      form.links = cloneValue(value.links || []);
    } else {
      form.uuid = crypto.randomUUID();
      form.type = '';
      form.title = '';
      form.description = '';
      form.purpose = '';
      form.status = { state: '', remarks: '' };
      form.protocols = [];
      form.remarks = '';
      form.props = [];
      form.links = [];
    }
  },
  { immediate: true },
);

function addProtocol(): void {
  form.protocols?.push({
    uuid: crypto.randomUUID(),
    title: '',
    name: '',
    portRanges: [],
  });
}
function removeProtocol(index: number): void {
  form.protocols?.splice(index, 1);
}
function addPortRange(protocolIndex: number): void {
  form.protocols?.[protocolIndex]?.portRanges?.push({
    transport: '',
    start: undefined,
    end: undefined,
  });
}
function removePortRange(protocolIndex: number, rangeIndex: number): void {
  form.protocols?.[protocolIndex]?.portRanges?.splice(rangeIndex, 1);
}
function updatePortRangeNumber(
  range: PortRange,
  key: 'start' | 'end',
  value: string,
): void {
  range[key] = value.trim() === '' ? undefined : Number(value);
}
function sanitizeProtocols(protocols: Protocol[] | undefined): Protocol[] {
  return (protocols || []).map((protocol) => ({
    uuid: protocol.uuid,
    title: protocol.title || '',
    name: protocol.name || '',
    portRanges: (protocol.portRanges || []).map((range) => ({
      transport: range.transport || '',
      start: range.start,
      end: range.end,
    })),
  }));
}

function validate(): boolean {
  Object.assign(fieldErrors, {
    type: '',
    title: '',
    description: '',
    purpose: '',
    statusState: '',
    server: '',
  });
  if (!String(form.type || '').trim()) fieldErrors.type = 'Type is required.';
  if (!String(form.title || '').trim())
    fieldErrors.title = 'Title is required.';
  if (!String(form.description || '').trim())
    fieldErrors.description = 'Description is required.';
  if (!String(form.purpose || '').trim())
    fieldErrors.purpose = 'Purpose is required.';
  if (!String(form.status?.state || '').trim())
    fieldErrors.statusState = 'Status state is required.';
  const valid =
    !fieldErrors.type &&
    !fieldErrors.title &&
    !fieldErrors.description &&
    !fieldErrors.purpose &&
    !fieldErrors.statusState;
  if (!valid)
    focusFirstInvalidField(document.getElementById(formId) || document);
  return valid;
}

async function submit(): Promise<void> {
  if (!validate()) return;
  try {
    await persistComponent(
      isEditMode.value
        ? `/api/oscal/system-security-plans/${props.sspId}/system-implementation/components/${form.uuid}`
        : `/api/oscal/system-security-plans/${props.sspId}/system-implementation/components`,
      {
        method: isEditMode.value ? 'PUT' : 'POST',
        data: { ...form, protocols: sanitizeProtocols(form.protocols) },
      },
    );
    const result = persistedComponent.value!;
    toast.add({
      severity: 'success',
      summary: isEditMode.value ? 'Component Saved' : 'Component Created',
      detail: isEditMode.value
        ? 'System component updated successfully.'
        : 'System component created successfully.',
      life: 2500,
    });
    if (isEditMode.value) emit('saved', result);
    else emit('created', result);
  } catch (error) {
    fieldErrors.server = resolveApiErrorMessage(
      error,
      isEditMode.value
        ? 'Unable to update this system component.'
        : 'Unable to create this system component.',
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
    :title="isEditMode ? 'EDIT COMPONENT' : 'CREATE COMPONENT'"
    description="Document component metadata, operational status, and protocol details."
    :form-id="formId"
    :submit-mode="isEditMode ? 'save' : 'create'"
    :submitting="saving"
    width-class="w-screen! sm:w-[94vw]! lg:w-[860px]!"
    @close="emit('cancel')"
  >
    <form :id="formId" class="space-y-4" @submit.prevent="submit">
      <V2EditorFormTemplate :error-summary="errorSummary">
        <SspEditorSection variant="plain" title="BASICS">
          <div class="grid gap-4 lg:grid-cols-2">
            <V2FormField label="UUID" input-id="system-component-uuid"
              ><template #default="fieldProps"
                ><InputText
                  :model-value="isEditMode ? form.uuid : 'Auto-generated'"
                  :input-id="fieldProps.inputId"
                  readonly
                  fluid /></template
            ></V2FormField>
            <V2FormField
              label="TYPE"
              input-id="system-component-type"
              required
              :error="fieldErrors.type"
              ><template #default="fieldProps"
                ><select
                  :id="fieldProps.inputId"
                  v-model="form.type"
                  class="ui-v2-body h-10 w-full border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 text-[var(--ui-v2-foreground)]"
                >
                  <option value="">Select component type</option>
                  <option
                    v-for="option in componentTypeOptions"
                    :key="option"
                    :value="option"
                  >
                    {{ option }}
                  </option>
                </select></template
              ></V2FormField
            >
            <V2FormField
              label="TITLE"
              input-id="system-component-title"
              required
              :error="fieldErrors.title"
              ><template #default="fieldProps"
                ><InputText
                  v-model="form.title"
                  :input-id="fieldProps.inputId"
                  fluid /></template
            ></V2FormField>
            <V2FormField
              label="STATUS STATE"
              input-id="system-component-status-state"
              required
              :error="fieldErrors.statusState"
              ><template #default="fieldProps"
                ><select
                  :id="fieldProps.inputId"
                  v-model="form.status.state"
                  class="ui-v2-body h-10 w-full border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 text-[var(--ui-v2-foreground)]"
                >
                  <option value="">Select status</option>
                  <option
                    v-for="option in componentStatusOptions"
                    :key="option"
                    :value="option"
                  >
                    {{ option }}
                  </option>
                </select></template
              ></V2FormField
            >
          </div>
          <V2FormField
            label="DESCRIPTION"
            input-id="system-component-description"
            required
            :error="fieldErrors.description"
            ><template #default="fieldProps"
              ><Textarea
                v-model="form.description"
                :input-id="fieldProps.inputId"
                rows="5"
                fluid /></template
          ></V2FormField>
          <V2FormField
            label="PURPOSE"
            input-id="system-component-purpose"
            required
            :error="fieldErrors.purpose"
            ><template #default="fieldProps"
              ><Textarea
                v-model="form.purpose"
                :input-id="fieldProps.inputId"
                rows="4"
                fluid /></template
          ></V2FormField>
          <div class="grid gap-4 lg:grid-cols-2">
            <V2FormField
              label="STATUS REMARKS"
              input-id="system-component-status-remarks"
              ><template #default="fieldProps"
                ><Textarea
                  v-model="form.status.remarks"
                  :input-id="fieldProps.inputId"
                  rows="3"
                  fluid /></template></V2FormField
            ><V2FormField label="REMARKS" input-id="system-component-remarks"
              ><template #default="fieldProps"
                ><Textarea
                  v-model="form.remarks"
                  :input-id="fieldProps.inputId"
                  rows="3"
                  fluid /></template
            ></V2FormField>
          </div>
        </SspEditorSection>
        <SspEditorCollectionSection title="PROTOCOLS">
          <div
            v-if="form.protocols?.length"
            class="divide-y divide-[var(--ui-v2-border)]"
          >
            <article
              v-for="(protocol, protocolIndex) in form.protocols || []"
              :key="protocol.uuid || `protocol-${protocolIndex}`"
              class="space-y-3 px-3 py-2.5"
            >
              <div
                class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start"
              >
                <SspEditorCompactField
                  :input-id="`protocol-title-${protocolIndex}`"
                  label="TITLE"
                >
                  <template #default="fieldProps">
                    <InputText
                      v-model="protocol.title"
                      :input-id="fieldProps.inputId"
                      fluid
                    />
                  </template>
                </SspEditorCompactField>

                <SspEditorCompactField
                  :input-id="`protocol-name-${protocolIndex}`"
                  label="NAME"
                >
                  <template #default="fieldProps">
                    <InputText
                      v-model="protocol.name"
                      :input-id="fieldProps.inputId"
                      fluid
                    />
                  </template>
                </SspEditorCompactField>

                <SspEditorRemoveButton
                  label="REMOVE PROTOCOL"
                  @click="removeProtocol(protocolIndex)"
                />
              </div>

              <div class="space-y-2">
                <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                  PORT RANGES
                </p>

                <div
                  class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)]"
                >
                  <div
                    v-if="protocol.portRanges?.length"
                    class="divide-y divide-[var(--ui-v2-border)]"
                  >
                    <div
                      v-for="(range, rangeIndex) in protocol.portRanges || []"
                      :key="`protocol-${protocolIndex}-range-${rangeIndex}`"
                      class="grid gap-3 px-3 py-2.5 lg:grid-cols-[minmax(0,1fr)_140px_140px_auto] lg:items-start"
                    >
                      <SspEditorCompactField
                        :input-id="`protocol-${protocolIndex}-transport-${rangeIndex}`"
                        label="TRANSPORT"
                      >
                        <template #default="fieldProps">
                          <InputText
                            v-model="range.transport"
                            :input-id="fieldProps.inputId"
                            fluid
                          />
                        </template>
                      </SspEditorCompactField>

                      <SspEditorCompactField
                        :input-id="`protocol-${protocolIndex}-start-${rangeIndex}`"
                        label="START PORT"
                      >
                        <template #default="fieldProps">
                          <input
                            :id="fieldProps.inputId"
                            :value="range.start ?? ''"
                            type="number"
                            class="ui-v2-body h-10 w-full border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 text-[var(--ui-v2-foreground)]"
                            @input="
                              updatePortRangeNumber(
                                range,
                                'start',
                                ($event.target as HTMLInputElement).value,
                              )
                            "
                          />
                        </template>
                      </SspEditorCompactField>

                      <SspEditorCompactField
                        :input-id="`protocol-${protocolIndex}-end-${rangeIndex}`"
                        label="END PORT"
                      >
                        <template #default="fieldProps">
                          <input
                            :id="fieldProps.inputId"
                            :value="range.end ?? ''"
                            type="number"
                            class="ui-v2-body h-10 w-full border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 text-[var(--ui-v2-foreground)]"
                            @input="
                              updatePortRangeNumber(
                                range,
                                'end',
                                ($event.target as HTMLInputElement).value,
                              )
                            "
                          />
                        </template>
                      </SspEditorCompactField>

                      <SspEditorRemoveButton
                        @click="removePortRange(protocolIndex, rangeIndex)"
                      />
                    </div>
                  </div>

                  <div v-else class="px-4 py-4">
                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[11px] font-medium leading-[1.45] tracking-[0.3px] text-[var(--ui-v2-tertiary-foreground)]"
                    >
                      No port ranges added.
                    </p>
                  </div>

                  <div
                    class="border-t border-[var(--ui-v2-border)] px-3 py-2.5"
                  >
                    <SspEditorAddButton
                      label="ADD PORT RANGE"
                      @click="addPortRange(protocolIndex)"
                    />
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="px-4 py-4">
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-medium leading-[1.45] tracking-[0.3px] text-[var(--ui-v2-tertiary-foreground)]"
            >
              No protocols added.
            </p>
          </div>

          <template #footer>
            <SspEditorAddButton label="ADD PROTOCOL" @click="addProtocol" />
          </template>
        </SspEditorCollectionSection>
      </V2EditorFormTemplate>
    </form>
  </V2EditorDrawer>
</template>
