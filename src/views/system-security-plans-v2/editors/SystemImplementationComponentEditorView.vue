<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
import V2StatePanel from '@/components/v2/system/V2StatePanel.vue';
import SspEditorFormPage, {
  type SspEditorBreadcrumbItem,
} from '@/components/v2/system-security-plans/forms/SspEditorFormPage.vue';
import SspEditorSection from '@/components/v2/system-security-plans/forms/SspEditorSection.vue';
import {
  cloneValue,
  getRouteParam,
  resolveApiErrorMessage,
} from './sspEditorHelpers';

const formId = 'ssp-system-component-editor';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const sspId = computed(() => getRouteParam(route, 'id'));
const componentId = computed(() => getRouteParam(route, 'componentId'));
const isEditMode = computed(() => componentId.value.length > 0);

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

const breadcrumbs = computed<SspEditorBreadcrumbItem[]>(() => [
  {
    label: 'IMPLEMENTATION',
    to: {
      name: 'system-security-plan-system-implementation',
      params: { id: sspId.value },
      query: { section: 'components' },
    },
  },
  {
    label: 'COMPONENTS',
    to: {
      name: 'system-security-plan-system-implementation',
      params: { id: sspId.value },
      query: { section: 'components' },
    },
  },
  { label: isEditMode.value ? 'EDIT COMPONENT' : 'CREATE COMPONENT' },
]);

const backTo = computed(() => ({
  name: 'system-security-plan-system-implementation',
  params: { id: sspId.value },
  query: { section: 'components' },
}));

const {
  data: components,
  isLoading,
  execute: loadComponents,
} = useDataApi<SystemComponent[]>(null, null, { immediate: false });

const {
  data: savedComponent,
  execute: persistComponent,
  isLoading: isSaving,
} = useDataApi<SystemComponent>(
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
  type: '',
  title: '',
  description: '',
  purpose: '',
  statusState: '',
});

const form = reactive<SystemComponent>({
  uuid: '',
  type: '',
  title: '',
  description: '',
  purpose: '',
  status: {
    state: '',
    remarks: '',
  },
  protocols: [],
  remarks: '',
  props: [],
  links: [],
});

const pageTitle = computed(() =>
  isEditMode.value ? 'EDIT COMPONENT' : 'CREATE COMPONENT',
);
const submitLabel = computed(() =>
  isEditMode.value ? 'SAVE COMPONENT' : 'CREATE COMPONENT',
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
    { message: serverErrorMessage.value },
  ]),
);

watch(
  [sspId, componentId],
  async ([nextSspId, nextComponentId]) => {
    resetErrors();
    resetForm();

    if (!nextSspId) {
      return;
    }

    if (!nextComponentId) {
      form.uuid = crypto.randomUUID();
      loadErrorMessage.value = '';
      return;
    }

    loadErrorMessage.value = '';

    try {
      await loadComponents(
        `/api/oscal/system-security-plans/${nextSspId}/system-implementation/components`,
      );

      const currentComponent = (components.value || []).find(
        (candidate) => candidate.uuid === nextComponentId,
      );

      if (!currentComponent) {
        throw new Error('The requested system component was not found.');
      }

      loadForm(currentComponent);
    } catch (error) {
      loadErrorMessage.value = resolveApiErrorMessage(
        error,
        'Unable to load this system component.',
      );
    }
  },
  { immediate: true },
);

function resetForm(): void {
  form.uuid = '';
  form.type = '';
  form.title = '';
  form.description = '';
  form.purpose = '';
  form.status = {
    state: '',
    remarks: '',
  };
  form.protocols = [];
  form.remarks = '';
  form.props = [];
  form.links = [];
}

function loadForm(value: SystemComponent): void {
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
}

function resetErrors(): void {
  fieldErrors.type = '';
  fieldErrors.title = '';
  fieldErrors.description = '';
  fieldErrors.purpose = '';
  fieldErrors.statusState = '';
  serverErrorMessage.value = '';
}

function addProtocol(): void {
  form.protocols = form.protocols || [];
  form.protocols.push({
    uuid: crypto.randomUUID(),
    title: '',
    name: '',
    portRanges: [],
  });
}

function removeProtocol(index: number): void {
  form.protocols = form.protocols || [];
  form.protocols.splice(index, 1);
}

function addPortRange(protocolIndex: number): void {
  const protocol = form.protocols?.[protocolIndex];
  if (!protocol) {
    return;
  }

  protocol.portRanges = protocol.portRanges || [];
  protocol.portRanges.push({
    transport: '',
    start: undefined,
    end: undefined,
  });
}

function removePortRange(protocolIndex: number, rangeIndex: number): void {
  const protocol = form.protocols?.[protocolIndex];
  if (!protocol?.portRanges) {
    return;
  }

  protocol.portRanges.splice(rangeIndex, 1);
}

function updatePortRangeNumber(
  range: PortRange,
  key: 'start' | 'end',
  value: string,
): void {
  range[key] = value.trim() === '' ? undefined : Number(value);
}

function validateForm(): boolean {
  resetErrors();

  if (!String(form.type || '').trim()) {
    fieldErrors.type = 'Type is required.';
  }
  if (!String(form.title || '').trim()) {
    fieldErrors.title = 'Title is required.';
  }
  if (!String(form.description || '').trim()) {
    fieldErrors.description = 'Description is required.';
  }
  if (!String(form.purpose || '').trim()) {
    fieldErrors.purpose = 'Purpose is required.';
  }
  if (!String(form.status?.state || '').trim()) {
    fieldErrors.statusState = 'Status state is required.';
  }

  const isValid =
    !fieldErrors.type &&
    !fieldErrors.title &&
    !fieldErrors.description &&
    !fieldErrors.purpose &&
    !fieldErrors.statusState;

  if (!isValid) {
    focusFirstInvalidField(document.getElementById(formId) || document);
  }

  return isValid;
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

async function handleSubmit(): Promise<void> {
  if (!validateForm()) {
    return;
  }

  const method = isEditMode.value ? 'PUT' : 'POST';
  const url = isEditMode.value
    ? `/api/oscal/system-security-plans/${sspId.value}/system-implementation/components/${componentId.value}`
    : `/api/oscal/system-security-plans/${sspId.value}/system-implementation/components`;

  try {
    await persistComponent(url, {
      method,
      data: {
        ...form,
        protocols: sanitizeProtocols(form.protocols),
      },
    });

    toast.add({
      severity: 'success',
      summary: isEditMode.value ? 'Component Saved' : 'Component Created',
      detail: isEditMode.value
        ? 'System component updated successfully.'
        : 'System component created successfully.',
      life: 2500,
    });

    if (savedComponent.value) {
      loadForm(savedComponent.value);
    }

    await router.push(backTo.value);
  } catch (error) {
    serverErrorMessage.value = resolveApiErrorMessage(
      error,
      isEditMode.value
        ? 'Unable to update this system component.'
        : 'Unable to create this system component.',
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
      v-if="isEditMode && isLoading && !components"
      kind="loading"
      title="Loading"
      description="Loading the selected system component..."
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
          <V2FormField label="UUID" input-id="system-component-uuid">
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
            label="TYPE"
            input-id="system-component-type"
            required
            :error="fieldErrors.type"
          >
            <template #default="fieldProps">
              <select
                :id="fieldProps.inputId"
                v-model="form.type"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                class="h-10 w-full border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 text-[var(--ui-v2-foreground)]"
              >
                <option value="">Select component type</option>
                <option
                  v-for="option in componentTypeOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
            </template>
          </V2FormField>

          <V2FormField
            label="TITLE"
            input-id="system-component-title"
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
            label="STATUS STATE"
            input-id="system-component-status-state"
            required
            :error="fieldErrors.statusState"
          >
            <template #default="fieldProps">
              <select
                :id="fieldProps.inputId"
                v-model="form.status.state"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                class="h-10 w-full border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 text-[var(--ui-v2-foreground)]"
              >
                <option value="">Select status</option>
                <option
                  v-for="option in componentStatusOptions"
                  :key="option"
                  :value="option"
                >
                  {{ option }}
                </option>
              </select>
            </template>
          </V2FormField>
        </div>

        <V2FormField
          label="DESCRIPTION"
          input-id="system-component-description"
          required
          :error="fieldErrors.description"
        >
          <template #default="fieldProps">
            <Textarea
              v-model="form.description"
              :input-id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              rows="5"
              fluid
            />
          </template>
        </V2FormField>

        <V2FormField
          label="PURPOSE"
          input-id="system-component-purpose"
          required
          :error="fieldErrors.purpose"
        >
          <template #default="fieldProps">
            <Textarea
              v-model="form.purpose"
              :input-id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              rows="4"
              fluid
            />
          </template>
        </V2FormField>

        <div class="grid gap-4 lg:grid-cols-2">
          <V2FormField
            label="STATUS REMARKS"
            input-id="system-component-status-remarks"
          >
            <template #default="fieldProps">
              <Textarea
                v-model="form.status.remarks"
                :input-id="fieldProps.inputId"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                rows="3"
                fluid
              />
            </template>
          </V2FormField>

          <V2FormField label="REMARKS" input-id="system-component-remarks">
            <template #default="fieldProps">
              <Textarea
                v-model="form.remarks"
                :input-id="fieldProps.inputId"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                rows="3"
                fluid
              />
            </template>
          </V2FormField>
        </div>
      </SspEditorSection>

      <SspEditorSection title="PROTOCOLS">
        <div class="space-y-4">
          <article
            v-for="(protocol, protocolIndex) in form.protocols"
            :key="protocol.uuid || `protocol-${protocolIndex}`"
            class="space-y-4 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-4"
          >
            <div class="flex justify-end">
              <button
                type="button"
                class="ui-v2-nav inline-flex h-8 items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-3 font-bold text-[var(--ui-v2-error)]"
                @click="removeProtocol(protocolIndex)"
              >
                REMOVE PROTOCOL
              </button>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
              <V2FormField
                :input-id="`protocol-title-${protocolIndex}`"
                label="Title"
              >
                <template #default="fieldProps">
                  <InputText
                    v-model="protocol.title"
                    :input-id="fieldProps.inputId"
                    :aria-describedby="fieldProps.describedBy"
                    :aria-invalid="fieldProps.invalid"
                    fluid
                  />
                </template>
              </V2FormField>

              <V2FormField
                :input-id="`protocol-name-${protocolIndex}`"
                label="Name"
              >
                <template #default="fieldProps">
                  <InputText
                    v-model="protocol.name"
                    :input-id="fieldProps.inputId"
                    :aria-describedby="fieldProps.describedBy"
                    :aria-invalid="fieldProps.invalid"
                    fluid
                  />
                </template>
              </V2FormField>
            </div>

            <div class="space-y-3">
              <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                PORT RANGES
              </p>

              <article
                v-for="(range, rangeIndex) in protocol.portRanges || []"
                :key="`protocol-${protocolIndex}-range-${rangeIndex}`"
                class="grid gap-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] p-3 lg:grid-cols-[minmax(0,1fr)_140px_140px_auto] lg:items-end"
              >
                <V2FormField
                  :input-id="`protocol-${protocolIndex}-transport-${rangeIndex}`"
                  label="Transport"
                >
                  <template #default="fieldProps">
                    <InputText
                      v-model="range.transport"
                      :input-id="fieldProps.inputId"
                      :aria-describedby="fieldProps.describedBy"
                      :aria-invalid="fieldProps.invalid"
                      fluid
                    />
                  </template>
                </V2FormField>

                <V2FormField
                  :input-id="`protocol-${protocolIndex}-start-${rangeIndex}`"
                  label="Start Port"
                >
                  <template #default="fieldProps">
                    <input
                      :id="fieldProps.inputId"
                      :value="range.start ?? ''"
                      :aria-describedby="fieldProps.describedBy"
                      :aria-invalid="fieldProps.invalid"
                      type="number"
                      class="h-10 w-full border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 text-[var(--ui-v2-foreground)]"
                      @input="
                        updatePortRangeNumber(
                          range,
                          'start',
                          ($event.target as HTMLInputElement).value,
                        )
                      "
                    />
                  </template>
                </V2FormField>

                <V2FormField
                  :input-id="`protocol-${protocolIndex}-end-${rangeIndex}`"
                  label="End Port"
                >
                  <template #default="fieldProps">
                    <input
                      :id="fieldProps.inputId"
                      :value="range.end ?? ''"
                      :aria-describedby="fieldProps.describedBy"
                      :aria-invalid="fieldProps.invalid"
                      type="number"
                      class="h-10 w-full border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 text-[var(--ui-v2-foreground)]"
                      @input="
                        updatePortRangeNumber(
                          range,
                          'end',
                          ($event.target as HTMLInputElement).value,
                        )
                      "
                    />
                  </template>
                </V2FormField>

                <button
                  type="button"
                  class="ui-v2-nav inline-flex h-10 items-center justify-center border border-[var(--ui-v2-error)] bg-[var(--ui-v2-error-tint-10)] px-3 font-bold text-[var(--ui-v2-error)]"
                  @click="removePortRange(protocolIndex, rangeIndex)"
                >
                  REMOVE
                </button>
              </article>

              <button
                type="button"
                class="ui-v2-nav inline-flex h-9 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] px-3 font-bold text-[var(--ui-v2-primary)]"
                @click="addPortRange(protocolIndex)"
              >
                ADD PORT RANGE
              </button>
            </div>
          </article>

          <button
            type="button"
            class="ui-v2-nav inline-flex h-9 items-center justify-center border border-[var(--ui-v2-primary)] bg-[var(--ui-v2-primary-tint-10)] px-3 font-bold text-[var(--ui-v2-primary)]"
            @click="addProtocol"
          >
            ADD PROTOCOL
          </button>
        </div>
      </SspEditorSection>
    </SspEditorFormPage>
  </div>
</template>
