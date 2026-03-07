<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import DangerButton from '@/volt/DangerButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Textarea from '@/volt/Textarea.vue';
import type { SystemUser } from '@/oscal';
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

const props = defineProps<{ sspId: string; user?: SystemUser | null }>();
const emit = defineEmits<{
  cancel: [];
  created: [user: SystemUser];
  saved: [user: SystemUser];
}>();

const toast = useToast();
const formId = `system-implementation-user-form-${crypto.randomUUID()}`;
const isEditMode = computed(() => Boolean(props.user));
const fieldErrors = reactive({ title: '', description: '', server: '' });
const form = reactive<{
  uuid: string;
  title: string;
  shortName: string;
  description: string;
  props: NonNullable<SystemUser['props']>;
  links: NonNullable<SystemUser['links']>;
  roleIds: string[];
  authorizedPrivileges: NonNullable<SystemUser['authorizedPrivileges']>;
}>({
  uuid: '',
  title: '',
  shortName: '',
  description: '',
  props: [],
  links: [],
  roleIds: [],
  authorizedPrivileges: [],
});

const {
  data: persistedUser,
  execute: persistUser,
  isLoading: saving,
} = useDataApi<SystemUser>(
  null,
  { method: 'POST', transformRequest: [decamelizeKeys] },
  { immediate: false },
);
const errorSummary = computed(() =>
  toErrorSummaryItems([
    { fieldId: 'system-user-title', message: fieldErrors.title },
    { fieldId: 'system-user-description', message: fieldErrors.description },
    { message: fieldErrors.server },
  ]).map((item) => item.message),
);

watch(
  () => props.user,
  (value) => {
    fieldErrors.title = '';
    fieldErrors.description = '';
    fieldErrors.server = '';
    if (value) {
      form.uuid = value.uuid;
      form.title = value.title || '';
      form.shortName = value.shortName || '';
      form.description = value.description || '';
      form.props = cloneValue(value.props || []);
      form.links = cloneValue(value.links || []);
      form.roleIds = cloneValue(value.roleIds || []);
      form.authorizedPrivileges = cloneValue(
        value.authorizedPrivileges || [],
      ).map((privilege) => ({
        ...privilege,
        functionsPerformed: cloneValue(privilege.functionsPerformed || []),
      }));
    } else {
      form.uuid = crypto.randomUUID();
      form.title = '';
      form.shortName = '';
      form.description = '';
      form.props = [];
      form.links = [];
      form.roleIds = [];
      form.authorizedPrivileges = [];
    }
  },
  { immediate: true },
);

function addRoleId(): void {
  form.roleIds.push('');
}
function removeRoleId(index: number): void {
  form.roleIds.splice(index, 1);
}
function addPrivilege(): void {
  form.authorizedPrivileges.push({
    title: '',
    description: '',
    functionsPerformed: [],
  });
}
function removePrivilege(index: number): void {
  form.authorizedPrivileges.splice(index, 1);
}
function addFunctionPerformed(index: number): void {
  form.authorizedPrivileges[index]?.functionsPerformed?.push('');
}
function removeFunctionPerformed(
  privilegeIndex: number,
  functionIndex: number,
): void {
  form.authorizedPrivileges[privilegeIndex]?.functionsPerformed?.splice(
    functionIndex,
    1,
  );
}

function validate(): boolean {
  fieldErrors.title = '';
  fieldErrors.description = '';
  fieldErrors.server = '';
  if (!form.title.trim()) fieldErrors.title = 'Title is required.';
  if (!form.description.trim())
    fieldErrors.description = 'Description is required.';
  const valid = !fieldErrors.title && !fieldErrors.description;
  if (!valid)
    focusFirstInvalidField(document.getElementById(formId) || document);
  return valid;
}

async function submit(): Promise<void> {
  if (!validate()) return;
  try {
    await persistUser(
      isEditMode.value
        ? `/api/oscal/system-security-plans/${props.sspId}/system-implementation/users/${form.uuid}`
        : `/api/oscal/system-security-plans/${props.sspId}/system-implementation/users`,
      { method: isEditMode.value ? 'PUT' : 'POST', data: form },
    );
    const result = persistedUser.value!;
    toast.add({
      severity: 'success',
      summary: isEditMode.value ? 'User Saved' : 'User Created',
      detail: isEditMode.value
        ? 'System user updated successfully.'
        : 'System user created successfully.',
      life: 2500,
    });
    if (isEditMode.value) emit('saved', result);
    else emit('created', result);
  } catch (error) {
    fieldErrors.server = resolveApiErrorMessage(
      error,
      isEditMode.value
        ? 'Unable to update this system user.'
        : 'Unable to create this system user.',
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
    :title="isEditMode ? 'EDIT USER' : 'CREATE USER'"
    :form-id="formId"
    :submit-label="isEditMode ? 'SAVE USER' : 'CREATE USER'"
    :submitting="saving"
    @close="emit('cancel')"
  >
    <form :id="formId" class="space-y-5" @submit.prevent="submit">
      <V2EditorFormTemplate :error-summary="errorSummary">
        <SspEditorSection variant="plain" title="BASICS">
          <div class="grid gap-4 lg:grid-cols-2">
            <V2FormField label="UUID" input-id="system-user-uuid"
              ><template #default="fieldProps"
                ><InputText
                  :model-value="isEditMode ? form.uuid : 'Auto-generated'"
                  :input-id="fieldProps.inputId"
                  readonly
                  fluid /></template
            ></V2FormField>
            <V2FormField
              label="TITLE"
              input-id="system-user-title"
              required
              :error="fieldErrors.title"
              ><template #default="fieldProps"
                ><InputText
                  v-model="form.title"
                  :input-id="fieldProps.inputId"
                  fluid /></template
            ></V2FormField>
            <V2FormField label="SHORT NAME" input-id="system-user-short-name"
              ><template #default="fieldProps"
                ><InputText
                  v-model="form.shortName"
                  :input-id="fieldProps.inputId"
                  fluid /></template
            ></V2FormField>
          </div>
          <V2FormField
            label="DESCRIPTION"
            input-id="system-user-description"
            required
            :error="fieldErrors.description"
            ><template #default="fieldProps"
              ><Textarea
                v-model="form.description"
                :input-id="fieldProps.inputId"
                rows="5"
                fluid /></template
          ></V2FormField>
        </SspEditorSection>
        <SspEditorSection variant="plain" title="ROLE IDS"
          ><div class="space-y-3">
            <article
              v-for="(roleId, index) in form.roleIds"
              :key="`role-${index}`"
              class="flex flex-col gap-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-3 md:flex-row md:items-end"
            >
              <V2FormField
                :input-id="`system-user-role-${index}`"
                label="Role ID"
                class="flex-1"
                ><template #default="fieldProps"
                  ><InputText
                    v-model="form.roleIds[index]"
                    :input-id="fieldProps.inputId"
                    fluid /></template></V2FormField
              ><DangerButton
                type="button"
                size="small"
                @click="removeRoleId(index)"
                >REMOVE</DangerButton
              >
            </article>
            <SecondaryButton type="button" size="small" @click="addRoleId"
              >ADD ROLE ID</SecondaryButton
            >
          </div></SspEditorSection
        >
        <SspEditorSection variant="plain" title="AUTHORIZED PRIVILEGES"
          ><div class="space-y-4">
            <article
              v-for="(privilege, privilegeIndex) in form.authorizedPrivileges"
              :key="`privilege-${privilegeIndex}`"
              class="space-y-4 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)] p-4"
            >
              <div class="flex justify-end">
                <DangerButton
                  type="button"
                  size="small"
                  @click="removePrivilege(privilegeIndex)"
                  >REMOVE PRIVILEGE</DangerButton
                >
              </div>
              <div class="grid gap-4 lg:grid-cols-2">
                <V2FormField
                  :input-id="`privilege-title-${privilegeIndex}`"
                  label="Title"
                  ><template #default="fieldProps"
                    ><InputText
                      v-model="privilege.title"
                      :input-id="fieldProps.inputId"
                      fluid /></template></V2FormField
                ><V2FormField
                  :input-id="`privilege-description-${privilegeIndex}`"
                  label="Description"
                  ><template #default="fieldProps"
                    ><Textarea
                      v-model="privilege.description"
                      :input-id="fieldProps.inputId"
                      rows="3"
                      fluid /></template
                ></V2FormField>
              </div>
              <div class="space-y-3">
                <p
                  class="font-[var(--ui-v2-font-secondary)] text-[11px] font-bold uppercase tracking-[1px] text-[var(--ui-v2-secondary-foreground)]"
                >
                  FUNCTIONS PERFORMED
                </p>
                <article
                  v-for="(_, functionIndex) in privilege.functionsPerformed ||
                  []"
                  :key="`privilege-${privilegeIndex}-function-${functionIndex}`"
                  class="flex flex-col gap-3 border border-[var(--ui-v2-border)] bg-[var(--ui-v2-surface)] p-3 md:flex-row md:items-end"
                >
                  <V2FormField
                    :input-id="`privilege-function-${privilegeIndex}-${functionIndex}`"
                    label="Function Description"
                    class="flex-1"
                    ><template #default="fieldProps"
                      ><InputText
                        v-model="privilege.functionsPerformed![functionIndex]"
                        :input-id="fieldProps.inputId"
                        fluid /></template></V2FormField
                  ><DangerButton
                    type="button"
                    size="small"
                    @click="
                      removeFunctionPerformed(privilegeIndex, functionIndex)
                    "
                    >REMOVE</DangerButton
                  >
                </article>
                <SecondaryButton
                  type="button"
                  size="small"
                  @click="addFunctionPerformed(privilegeIndex)"
                  >ADD FUNCTION</SecondaryButton
                >
              </div>
            </article>
            <SecondaryButton type="button" size="small" @click="addPrivilege"
              >ADD PRIVILEGE</SecondaryButton
            >
          </div></SspEditorSection
        >
      </V2EditorFormTemplate>
    </form>
  </V2EditorDrawer>
</template>
