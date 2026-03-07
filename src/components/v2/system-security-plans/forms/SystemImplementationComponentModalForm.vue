<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import DangerButton from '@/volt/DangerButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
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
    :form-id="formId"
    :submit-label="isEditMode ? 'SAVE COMPONENT' : 'CREATE COMPONENT'"
    :submitting="saving"
    @close="emit('cancel')"
  >
    <form :id="formId" class="space-y-5" @submit.prevent="submit">
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
        <SspEditorSection variant="plain" title="PROTOCOLS"
          ><div class="space-y-4">
            <article
              v-for="(protocol, protocolIndex) in form.protocols"
              :key="protocol.uuid || `protocol-${protocolIndex}`"
              class="space-y-4 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
            >
              <div class="flex justify-end">
                <DangerButton
                  type="button"
                  size="small"
                  @click="removeProtocol(protocolIndex)"
                  >REMOVE PROTOCOL</DangerButton
                >
              </div>
              <div class="grid gap-4 lg:grid-cols-2">
                <V2FormField
                  :input-id="`protocol-title-${protocolIndex}`"
                  label="Title"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="protocol.title"
                      :input-id="fieldProps.inputId"
                      fluid /></template></V2FormField
                ><V2FormField
                  :input-id="`protocol-name-${protocolIndex}`"
                  label="Name"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="protocol.name"
                      :input-id="fieldProps.inputId"
                      fluid /></template
                ></V2FormField>
              </div>
              <div class="space-y-3">
                <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                  PORT RANGES
                </p>
                <article
                  v-for="(range, rangeIndex) in protocol.portRanges || []"
                  :key="`protocol-${protocolIndex}-range-${rangeIndex}`"
                  class="grid gap-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3 lg:grid-cols-[minmax(0,1fr)_140px_140px_auto] lg:items-end"
                >
                  <V2FormField
                    :input-id="`protocol-${protocolIndex}-transport-${rangeIndex}`"
                    label="Transport"
                    ><template #default="fieldProps"
                      ><InputText
                        v-model="range.transport"
                        :input-id="fieldProps.inputId"
                        fluid /></template></V2FormField
                  ><V2FormField
                    :input-id="`protocol-${protocolIndex}-start-${rangeIndex}`"
                    label="Start Port"
                    ><template #default="fieldProps"
                      ><input
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
                        " /></template></V2FormField
                  ><V2FormField
                    :input-id="`protocol-${protocolIndex}-end-${rangeIndex}`"
                    label="End Port"
                    ><template #default="fieldProps"
                      ><input
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
                        " /></template></V2FormField
                  ><DangerButton
                    type="button"
                    size="small"
                    @click="removePortRange(protocolIndex, rangeIndex)"
                    >REMOVE</DangerButton
                  >
                </article>
                <SecondaryButton
                  type="button"
                  size="small"
                  @click="addPortRange(protocolIndex)"
                  >ADD PORT RANGE</SecondaryButton
                >
              </div>
            </article>
            <SecondaryButton type="button" size="small" @click="addProtocol"
              >ADD PROTOCOL</SecondaryButton
            >
          </div></SspEditorSection
        >
      </V2EditorFormTemplate>
    </form>
  </V2EditorDrawer>
</template>
