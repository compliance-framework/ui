<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import DangerButton from '@/volt/DangerButton.vue';
import InputText from '@/volt/InputText.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Textarea from '@/volt/Textarea.vue';
import type {
  ByComponent,
  ImplementedRequirement,
  Statement,
  SystemComponent,
} from '@/oscal';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { focusFirstInvalidField } from '@/composables/v2/useV2FormValidation';
import V2FormField from '@/components/v2/forms/V2FormField.vue';
import V2EditorDrawer from '@/components/v2/patterns/V2EditorDrawer.vue';
import V2EditorFormTemplate from '@/components/v2/patterns/V2EditorFormTemplate.vue';
import {
  cloneValue,
  resolveApiErrorMessage,
} from '@/views/system-security-plans-v2/editors/sspEditorHelpers';

const props = defineProps<{
  sspId: string;
  requirement: ImplementedRequirement;
  statement?: Statement | null;
  byComponent?: ByComponent | null;
  systemComponents?: SystemComponent[];
  preferredComponentUuid?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  created: [byComponent: ByComponent];
  saved: [byComponent: ByComponent];
}>();

const toast = useToast();
const formId = `by-component-form-${crypto.randomUUID()}`;
const isEditMode = computed(() => Boolean(props.byComponent));
const isStatementScoped = computed(() => Boolean(props.statement));

const implementationStates = [
  'implemented',
  'partial',
  'planned',
  'alternative',
  'not-applicable',
];

const componentOptions = computed(() => props.systemComponents || []);
const exportDescription = computed({
  get: () => form.export?.description || '',
  set: (value: string) => {
    ensureExport().description = value;
  },
});

const form = reactive<ByComponent>({
  uuid: '',
  componentUuid: '',
  description: '',
  props: [],
  links: [],
  setParameters: [],
  responsibleRoles: [],
  remarks: '',
  implementationStatus: { state: '', remarks: '' },
  export: undefined,
  inherited: [],
  satisfied: [],
});

const fieldErrors = reactive({
  componentUuid: '',
  description: '',
  server: '',
});

const {
  data: persistedByComponent,
  execute: persistByComponent,
  isLoading: saving,
} = useDataApi<ByComponent>(
  null,
  {
    method: 'POST',
    transformRequest: [decamelizeKeys],
  },
  { immediate: false },
);

const errorSummary = computed(() =>
  [
    fieldErrors.componentUuid,
    fieldErrors.description,
    fieldErrors.server,
  ].filter(Boolean),
);

watch(
  () => [props.byComponent, props.preferredComponentUuid] as const,
  ([value, preferredComponentUuid]) => {
    resetErrors();

    if (value) {
      Object.assign(form, cloneValue(value));
      form.implementationStatus = cloneValue(
        value.implementationStatus || { state: '', remarks: '' },
      );
      form.export = value.export ? cloneExport(value.export) : undefined;
      form.inherited = cloneValue(value.inherited || []);
      form.satisfied = cloneValue(value.satisfied || []);
      form.setParameters = cloneValue(value.setParameters || []);
      form.responsibleRoles = cloneValue(value.responsibleRoles || []);
      return;
    }

    resetForm();
    form.componentUuid = String(preferredComponentUuid || '').trim();
  },
  { immediate: true },
);

function cloneExport(value: NonNullable<ByComponent['export']>) {
  return {
    ...cloneValue(value),
    provided: cloneValue(value.provided || []),
    responsibilities: cloneValue(value.responsibilities || []),
  };
}

function resetForm(): void {
  form.uuid = crypto.randomUUID();
  form.componentUuid = '';
  form.description = '';
  form.props = [];
  form.links = [];
  form.setParameters = [];
  form.responsibleRoles = [];
  form.remarks = '';
  form.implementationStatus = { state: '', remarks: '' };
  form.export = undefined;
  form.inherited = [];
  form.satisfied = [];
}

function resetErrors(): void {
  fieldErrors.componentUuid = '';
  fieldErrors.description = '';
  fieldErrors.server = '';
}

function ensureExport(): NonNullable<ByComponent['export']> {
  if (!form.export) {
    form.export = {
      uuid: crypto.randomUUID(),
      description: '',
      props: [],
      links: [],
      provided: [],
      responsibilities: [],
    };
  }

  if (!form.export.provided) {
    form.export.provided = [];
  }
  if (!form.export.responsibilities) {
    form.export.responsibilities = [];
  }

  return form.export;
}

function addProvided(): void {
  const exportBlock = ensureExport();
  exportBlock.provided!.push({
    uuid: crypto.randomUUID(),
    description: '',
    props: [],
    links: [],
  });
}

function removeProvided(index: number): void {
  form.export?.provided?.splice(index, 1);
}

function addResponsibility(): void {
  const exportBlock = ensureExport();
  exportBlock.responsibilities!.push({
    uuid: crypto.randomUUID(),
    description: '',
    props: [],
    links: [],
    providedUuid: '',
  });
}

function removeResponsibility(index: number): void {
  form.export?.responsibilities?.splice(index, 1);
}

function addInherited(): void {
  form.inherited = form.inherited || [];
  form.inherited.push({
    uuid: crypto.randomUUID(),
    providedUuid: '',
    description: '',
    props: [],
    links: [],
  });
}

function removeInherited(index: number): void {
  form.inherited = form.inherited || [];
  form.inherited.splice(index, 1);
}

function addSatisfied(): void {
  form.satisfied = form.satisfied || [];
  form.satisfied.push({
    uuid: crypto.randomUUID(),
    responsibilityUuid: '',
    description: '',
    props: [],
    links: [],
  });
}

function removeSatisfied(index: number): void {
  form.satisfied = form.satisfied || [];
  form.satisfied.splice(index, 1);
}

function addParameter(): void {
  form.setParameters = form.setParameters || [];
  form.setParameters.push({ paramId: '', values: [''], remarks: '' });
}

function removeParameter(index: number): void {
  form.setParameters = form.setParameters || [];
  form.setParameters.splice(index, 1);
}

function setParameterValues(index: number, value: string): void {
  const parameter = form.setParameters?.[index];
  if (!parameter) {
    return;
  }

  parameter.values = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function addRole(): void {
  form.responsibleRoles = form.responsibleRoles || [];
  form.responsibleRoles.push({
    roleId: '',
    partyUuids: [],
    props: [],
    links: [],
  });
}

function removeRole(index: number): void {
  form.responsibleRoles = form.responsibleRoles || [];
  form.responsibleRoles.splice(index, 1);
}

function setRolePartyUuids(index: number, value: string): void {
  const role = form.responsibleRoles?.[index];
  if (!role) {
    return;
  }

  role.partyUuids = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function validate(): boolean {
  resetErrors();

  if (!form.componentUuid.trim()) {
    fieldErrors.componentUuid = 'Component is required.';
  }
  if (!form.description.trim()) {
    fieldErrors.description = 'Description is required.';
  }

  const valid = !fieldErrors.componentUuid && !fieldErrors.description;
  if (!valid) {
    focusFirstInvalidField(document.getElementById(formId) || document);
  }

  return valid;
}

async function submit(): Promise<void> {
  if (!validate()) {
    return;
  }

  const baseUrl = isStatementScoped.value
    ? `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${props.requirement.uuid}/statements/${props.statement!.uuid}/by-components`
    : `/api/oscal/system-security-plans/${props.sspId}/control-implementation/implemented-requirements/${props.requirement.uuid}/by-components`;

  const url = isEditMode.value ? `${baseUrl}/${form.uuid}` : baseUrl;
  const method = isEditMode.value ? 'PUT' : 'POST';

  try {
    await persistByComponent(url, { method, data: form });

    const result = persistedByComponent.value!;
    toast.add({
      severity: 'success',
      summary: isEditMode.value ? 'Component Saved' : 'Component Created',
      detail: isEditMode.value
        ? 'By-component implementation updated successfully.'
        : 'By-component implementation created successfully.',
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
        ? 'Unable to update by-component implementation.'
        : 'Unable to create by-component implementation.',
    );
  }
}
</script>

<template>
  <V2EditorDrawer
    :title="
      isEditMode
        ? 'EDIT BY-COMPONENT IMPLEMENTATION'
        : 'CREATE BY-COMPONENT IMPLEMENTATION'
    "
    description="Map requirement behavior to a specific component and describe how the implementation is delivered."
    :submit-mode="isEditMode ? 'save' : 'create'"
    :submitting="saving"
    :form-id="formId"
    width-class="w-screen! sm:w-[94vw]! lg:w-[980px]!"
    @close="emit('cancel')"
  >
    <form :id="formId" class="space-y-5" @submit.prevent="submit">
      <V2EditorFormTemplate :error-summary="errorSummary">
        <div class="grid gap-4 md:grid-cols-2">
          <V2FormField label="UUID" input-id="by-component-uuid">
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
            label="COMPONENT"
            input-id="by-component-component-uuid"
            required
            :error="fieldErrors.componentUuid"
          >
            <template #default="fieldProps">
              <select
                v-if="componentOptions.length"
                :id="fieldProps.inputId"
                v-model="form.componentUuid"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                class="ui-v2-body h-10 w-full border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 text-[var(--ui-v2-foreground)]"
              >
                <option value="">Select component</option>
                <option
                  v-for="component in componentOptions"
                  :key="component.uuid"
                  :value="component.uuid"
                >
                  {{ component.title || component.uuid }}
                </option>
              </select>
              <InputText
                v-else
                v-model="form.componentUuid"
                :input-id="fieldProps.inputId"
                :aria-describedby="fieldProps.describedBy"
                :aria-invalid="fieldProps.invalid"
                fluid
              />
            </template>
          </V2FormField>
        </div>

        <V2FormField
          label="DESCRIPTION"
          input-id="by-component-description"
          required
          :error="fieldErrors.description"
        >
          <template #default="fieldProps">
            <Textarea
              v-model="form.description"
              :input-id="fieldProps.inputId"
              :aria-describedby="fieldProps.describedBy"
              :aria-invalid="fieldProps.invalid"
              rows="4"
              fluid
            />
          </template>
        </V2FormField>

        <div class="grid gap-4 md:grid-cols-2">
          <V2FormField
            label="IMPLEMENTATION STATE"
            input-id="by-component-state"
          >
            <template #default="fieldProps">
              <select
                :id="fieldProps.inputId"
                v-model="form.implementationStatus!.state"
                class="ui-v2-body h-10 w-full border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] px-3 text-[var(--ui-v2-foreground)]"
              >
                <option value="">Select state</option>
                <option
                  v-for="state in implementationStates"
                  :key="state"
                  :value="state"
                >
                  {{ state }}
                </option>
              </select>
            </template>
          </V2FormField>

          <V2FormField
            label="STATUS REMARKS"
            input-id="by-component-status-remarks"
          >
            <template #default="fieldProps">
              <Textarea
                v-model="form.implementationStatus!.remarks"
                :input-id="fieldProps.inputId"
                rows="3"
                fluid
              />
            </template>
          </V2FormField>
        </div>

        <V2FormField label="REMARKS" input-id="by-component-remarks">
          <template #default="fieldProps">
            <Textarea
              v-model="form.remarks"
              :input-id="fieldProps.inputId"
              rows="3"
              fluid
            />
          </template>
        </V2FormField>

        <section class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              EXPORT / PROVIDED
            </p>
            <div class="flex gap-2">
              <SecondaryButton type="button" size="small" @click="addProvided"
                >ADD PROVIDED</SecondaryButton
              >
              <SecondaryButton
                type="button"
                size="small"
                @click="addResponsibility"
                >ADD RESPONSIBILITY</SecondaryButton
              >
            </div>
          </div>

          <V2FormField
            label="EXPORT DESCRIPTION"
            input-id="by-component-export-description"
          >
            <template #default="fieldProps">
              <Textarea
                v-model="exportDescription"
                :input-id="fieldProps.inputId"
                rows="3"
                fluid
              />
            </template>
          </V2FormField>

          <div v-if="form.export?.provided?.length" class="space-y-3">
            <article
              v-for="(provided, index) in form.export.provided"
              :key="provided.uuid"
              class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
            >
              <div class="flex justify-end">
                <DangerButton
                  type="button"
                  size="small"
                  @click="removeProvided(index)"
                  >REMOVE</DangerButton
                >
              </div>
              <V2FormField
                :input-id="`by-component-provided-description-${index}`"
                label="Provided Description"
              >
                <template #default="fieldProps">
                  <Textarea
                    v-model="provided.description"
                    :input-id="fieldProps.inputId"
                    rows="3"
                    fluid
                  />
                </template>
              </V2FormField>
            </article>
          </div>

          <div v-if="form.export?.responsibilities?.length" class="space-y-3">
            <article
              v-for="(responsibility, index) in form.export.responsibilities"
              :key="responsibility.uuid"
              class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
            >
              <div class="flex justify-end">
                <DangerButton
                  type="button"
                  size="small"
                  @click="removeResponsibility(index)"
                  >REMOVE</DangerButton
                >
              </div>
              <V2FormField
                :input-id="`by-component-responsibility-description-${index}`"
                label="Responsibility Description"
              >
                <template #default="fieldProps">
                  <Textarea
                    v-model="responsibility.description"
                    :input-id="fieldProps.inputId"
                    rows="3"
                    fluid
                  />
                </template>
              </V2FormField>
              <V2FormField
                :input-id="`by-component-responsibility-provided-${index}`"
                label="Provided UUID Link"
              >
                <template #default="fieldProps">
                  <InputText
                    v-model="responsibility.providedUuid"
                    :input-id="fieldProps.inputId"
                    fluid
                  />
                </template>
              </V2FormField>
            </article>
          </div>
        </section>

        <section class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              INHERITED / SATISFIED
            </p>
            <div class="flex gap-2">
              <SecondaryButton type="button" size="small" @click="addInherited"
                >ADD INHERITED</SecondaryButton
              >
              <SecondaryButton type="button" size="small" @click="addSatisfied"
                >ADD SATISFIED</SecondaryButton
              >
            </div>
          </div>

          <div v-if="form.inherited?.length" class="space-y-3">
            <article
              v-for="(item, index) in form.inherited"
              :key="item.uuid"
              class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
            >
              <div class="flex justify-end">
                <DangerButton
                  type="button"
                  size="small"
                  @click="removeInherited(index)"
                  >REMOVE</DangerButton
                >
              </div>
              <V2FormField
                :input-id="`by-component-inherited-description-${index}`"
                label="Inherited Description"
                ><template #default="fieldProps"
                  ><Textarea
                    v-model="item.description"
                    :input-id="fieldProps.inputId"
                    rows="3"
                    fluid /></template
              ></V2FormField>
              <V2FormField
                :input-id="`by-component-inherited-provided-${index}`"
                label="Provided UUID"
                ><template #default="fieldProps"
                  ><InputText
                    v-model="item.providedUuid"
                    :input-id="fieldProps.inputId"
                    fluid /></template
              ></V2FormField>
            </article>
          </div>

          <div v-if="form.satisfied?.length" class="space-y-3">
            <article
              v-for="(item, index) in form.satisfied"
              :key="item.uuid"
              class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
            >
              <div class="flex justify-end">
                <DangerButton
                  type="button"
                  size="small"
                  @click="removeSatisfied(index)"
                  >REMOVE</DangerButton
                >
              </div>
              <V2FormField
                :input-id="`by-component-satisfied-description-${index}`"
                label="Satisfied Description"
                ><template #default="fieldProps"
                  ><Textarea
                    v-model="item.description"
                    :input-id="fieldProps.inputId"
                    rows="3"
                    fluid /></template
              ></V2FormField>
              <V2FormField
                :input-id="`by-component-satisfied-responsibility-${index}`"
                label="Responsibility UUID"
                ><template #default="fieldProps"
                  ><InputText
                    v-model="item.responsibilityUuid"
                    :input-id="fieldProps.inputId"
                    fluid /></template
              ></V2FormField>
            </article>
          </div>
        </section>

        <section class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              SET PARAMETERS
            </p>
            <SecondaryButton type="button" size="small" @click="addParameter"
              >ADD PARAMETER</SecondaryButton
            >
          </div>

          <div v-if="form.setParameters?.length" class="space-y-3">
            <article
              v-for="(parameter, index) in form.setParameters"
              :key="`parameter-${index}`"
              class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
            >
              <div class="flex justify-end">
                <DangerButton
                  type="button"
                  size="small"
                  @click="removeParameter(index)"
                  >REMOVE</DangerButton
                >
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <V2FormField
                  :input-id="`by-component-param-id-${index}`"
                  label="Parameter ID"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="parameter.paramId"
                      :input-id="fieldProps.inputId"
                      fluid /></template
                ></V2FormField>
                <V2FormField
                  :input-id="`by-component-param-values-${index}`"
                  label="Values (comma separated)"
                  ><template #default="fieldProps"
                    ><InputText
                      :model-value="(parameter.values || []).join(', ')"
                      :input-id="fieldProps.inputId"
                      fluid
                      @update:model-value="
                        setParameterValues(index, $event)
                      " /></template
                ></V2FormField>
              </div>
              <V2FormField
                :input-id="`by-component-param-remarks-${index}`"
                label="Remarks"
                ><template #default="fieldProps"
                  ><Textarea
                    v-model="parameter.remarks"
                    :input-id="fieldProps.inputId"
                    rows="3"
                    fluid /></template
              ></V2FormField>
            </article>
          </div>
        </section>

        <section class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
              RESPONSIBLE ROLES
            </p>
            <SecondaryButton type="button" size="small" @click="addRole"
              >ADD ROLE</SecondaryButton
            >
          </div>

          <div v-if="form.responsibleRoles?.length" class="space-y-3">
            <article
              v-for="(role, index) in form.responsibleRoles"
              :key="`role-${index}`"
              class="space-y-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3"
            >
              <div class="flex justify-end">
                <DangerButton
                  type="button"
                  size="small"
                  @click="removeRole(index)"
                  >REMOVE</DangerButton
                >
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <V2FormField
                  :input-id="`by-component-role-id-${index}`"
                  label="Role ID"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="role.roleId"
                      :input-id="fieldProps.inputId"
                      fluid /></template
                ></V2FormField>
                <V2FormField
                  :input-id="`by-component-role-party-uuids-${index}`"
                  label="Party UUIDs (comma separated)"
                  ><template #default="fieldProps"
                    ><InputText
                      :model-value="(role.partyUuids || []).join(', ')"
                      :input-id="fieldProps.inputId"
                      fluid
                      @update:model-value="
                        setRolePartyUuids(index, $event)
                      " /></template
                ></V2FormField>
              </div>
            </article>
          </div>
        </section>
      </V2EditorFormTemplate>
    </form>
  </V2EditorDrawer>
</template>
