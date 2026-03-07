<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
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
import SspEditorAddButton from '@/components/v2/system-security-plans/forms/SspEditorAddButton.vue';
import SspEditorCollectionSection from '@/components/v2/system-security-plans/forms/SspEditorCollectionSection.vue';
import SspEditorCompactField from '@/components/v2/system-security-plans/forms/SspEditorCompactField.vue';
import SspEditorRemoveButton from '@/components/v2/system-security-plans/forms/SspEditorRemoveButton.vue';
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
    description="Maintain implementation users, role assignments, and authorized privileges."
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
        <SspEditorCollectionSection title="ROLE IDS">
          <div
            v-if="form.roleIds.length"
            class="divide-y divide-[var(--ui-v2-border)]"
          >
            <article
              v-for="(roleId, index) in form.roleIds"
              :key="`role-${index}`"
              class="grid gap-3 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
            >
              <SspEditorCompactField
                :input-id="`system-user-role-${index}`"
                label="ROLE ID"
              >
                <template #default="fieldProps">
                  <InputText
                    v-model="form.roleIds[index]"
                    :input-id="fieldProps.inputId"
                    fluid
                  />
                </template>
              </SspEditorCompactField>

              <SspEditorRemoveButton @click="removeRoleId(index)" />
            </article>
          </div>

          <div v-else class="px-4 py-4">
            <p
              class="font-[var(--ui-v2-font-secondary)] text-[11px] font-medium leading-[1.45] tracking-[0.3px] text-[var(--ui-v2-tertiary-foreground)]"
            >
              No role IDs added.
            </p>
          </div>

          <template #footer>
            <SspEditorAddButton label="ADD ROLE ID" @click="addRoleId" />
          </template>
        </SspEditorCollectionSection>

        <SspEditorCollectionSection title="AUTHORIZED PRIVILEGES">
          <div
            v-if="form.authorizedPrivileges.length"
            class="divide-y divide-[var(--ui-v2-border)]"
          >
            <article
              v-for="(privilege, privilegeIndex) in form.authorizedPrivileges"
              :key="`privilege-${privilegeIndex}`"
              class="space-y-3 px-3 py-2.5"
            >
              <div
                class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start"
              >
                <SspEditorCompactField
                  :input-id="`privilege-title-${privilegeIndex}`"
                  label="TITLE"
                >
                  <template #default="fieldProps">
                    <InputText
                      v-model="privilege.title"
                      :input-id="fieldProps.inputId"
                      fluid
                    />
                  </template>
                </SspEditorCompactField>

                <SspEditorCompactField
                  :input-id="`privilege-description-${privilegeIndex}`"
                  label="DESCRIPTION"
                >
                  <template #default="fieldProps">
                    <Textarea
                      v-model="privilege.description"
                      :input-id="fieldProps.inputId"
                      rows="3"
                      fluid
                    />
                  </template>
                </SspEditorCompactField>

                <SspEditorRemoveButton
                  label="REMOVE PRIVILEGE"
                  @click="removePrivilege(privilegeIndex)"
                />
              </div>

              <div class="space-y-2">
                <p class="ui-v2-label text-[var(--ui-v2-secondary-foreground)]">
                  FUNCTIONS PERFORMED
                </p>

                <div
                  class="border border-[var(--ui-v2-border)] bg-[var(--ui-v2-background)]"
                >
                  <div
                    v-if="privilege.functionsPerformed?.length"
                    class="divide-y divide-[var(--ui-v2-border)]"
                  >
                    <div
                      v-for="(
                        _, functionIndex
                      ) in privilege.functionsPerformed || []"
                      :key="`privilege-${privilegeIndex}-function-${functionIndex}`"
                      class="grid gap-3 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
                    >
                      <SspEditorCompactField
                        :input-id="`privilege-function-${privilegeIndex}-${functionIndex}`"
                        label="FUNCTION DESCRIPTION"
                      >
                        <template #default="fieldProps">
                          <InputText
                            v-model="
                              privilege.functionsPerformed![functionIndex]
                            "
                            :input-id="fieldProps.inputId"
                            fluid
                          />
                        </template>
                      </SspEditorCompactField>

                      <SspEditorRemoveButton
                        @click="
                          removeFunctionPerformed(privilegeIndex, functionIndex)
                        "
                      />
                    </div>
                  </div>

                  <div v-else class="px-4 py-4">
                    <p
                      class="font-[var(--ui-v2-font-secondary)] text-[11px] font-medium leading-[1.45] tracking-[0.3px] text-[var(--ui-v2-tertiary-foreground)]"
                    >
                      No functions added.
                    </p>
                  </div>

                  <div
                    class="border-t border-[var(--ui-v2-border)] px-3 py-2.5"
                  >
                    <SspEditorAddButton
                      label="ADD FUNCTION"
                      @click="addFunctionPerformed(privilegeIndex)"
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
              No authorized privileges added.
            </p>
          </div>

          <template #footer>
            <SspEditorAddButton label="ADD PRIVILEGE" @click="addPrivilege" />
          </template>
        </SspEditorCollectionSection>
      </V2EditorFormTemplate>
    </form>
  </V2EditorDrawer>
</template>
