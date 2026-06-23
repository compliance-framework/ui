<script setup lang="ts">
import type { Catalog, Group } from '@/oscal';
import Dialog from '@/volt/Dialog.vue';
import Label from '@/volt/Label.vue';
import InputText from '@/volt/InputText.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { reactive, watch, watchEffect } from 'vue';
import { useDataApi, decamelizeKeys } from '@/composables/axios';
import { useToast } from 'primevue/usetoast';
import { useFormSubmit } from '@/composables/useFormSubmit';
import { usePermissions } from '@/composables/usePermissions';
import { RESOURCES, ACTIONS } from '@/constants/permissions';

const { can, permissionTooltip } = usePermissions();

const show = defineModel<boolean>();

const emit = defineEmits({
  updated(group: Group) {
    return !!group.id;
  },
});

const props = defineProps<{
  catalog: Catalog;
  group: Group;
}>();

const toast = useToast();
const form = reactive({ title: '', class: '' });
const {
  errors,
  errorMessage,
  isSubmitting,
  resetFormState,
  validate,
  getErrorMessage,
} = useFormSubmit(
  [
    {
      key: 'title',
      message: 'Title is required',
      isMissing: () => !form.title.trim(),
    },
  ],
  'Failed to update group.',
);

watchEffect(() => {
  form.title = props.group?.title || '';
  form.class = props.group?.class || '';
});

watch(show, (open) => {
  if (open) resetFormState();
});

const { execute: update } = useDataApi<Group>(
  `/api/oscal/catalogs/${props.catalog.uuid}/groups/${props.group.id}`,
  {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    transformRequest: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data, headers) => decamelizeKeys(data as any, headers as any),
    ],
  },
  { immediate: false },
);

async function submit() {
  if (!validate()) return;

  const payload: Group = {
    ...props.group,
    title: form.title,
    class: form.class,
  } as Group;
  isSubmitting.value = true;
  try {
    const resp = await update({ data: payload });
    const updated = resp.data.value?.data;
    if (updated) {
      toast.add({
        severity: 'success',
        summary: 'Group updated',
        detail: 'Group saved',
        life: 3000,
      });
      emit('updated', updated);
      show.value = false;
    }
  } catch (e) {
    errorMessage.value = getErrorMessage(e);
    toast.add({
      severity: 'error',
      summary: 'Update failed',
      detail: errorMessage.value,
      life: 3000,
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:visible="show"
    modal
    header="Edit Group"
    :draggable="false"
    class="w-full max-w-2xl"
  >
    <form @submit.prevent="submit" class="space-y-6">
      <div>
        <Label for="group-edit-id">ID</Label>
        <InputText
          id="group-edit-id"
          :model-value="props.group.id"
          class="w-full"
          disabled
        />
      </div>
      <div>
        <Label for="group-edit-title" required>Title</Label>
        <InputText
          id="group-edit-title"
          v-model="form.title"
          placeholder="Enter group title"
          class="w-full"
          :invalid="!!errors.title"
        />
        <small v-if="errors.title" class="text-red-500">
          {{ errors.title }}
        </small>
      </div>
      <div>
        <Label for="group-edit-class">Class</Label>
        <InputText
          id="group-edit-class"
          v-model="form.class"
          placeholder="Optional class"
          class="w-full"
        />
      </div>

      <Message v-if="errorMessage" severity="error">
        {{ errorMessage }}
      </Message>

      <div
        class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700"
      >
        <SecondaryButton type="button" @click="show = false">
          Cancel
        </SecondaryButton>
        <PrimaryButton
          type="submit"
          :disabled="isSubmitting || !can(RESOURCES.CATALOG, ACTIONS.UPDATE)"
          v-tooltip.top="{
            value: permissionTooltip(RESOURCES.CATALOG, ACTIONS.UPDATE),
            disabled: can(RESOURCES.CATALOG, ACTIONS.UPDATE),
          }"
        >
          <i v-if="isSubmitting" class="pi pi-spin pi-spinner mr-2"></i>
          Save Group
        </PrimaryButton>
      </div>
    </form>
  </Dialog>
</template>
