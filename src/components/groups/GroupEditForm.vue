<template>
  <div class="px-12 py-8">
    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Name</label>
      <FormInput v-model="form.name" placeholder="Group name" required />
    </div>
    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description</label>
      <FormInput
        v-model="form.description"
        placeholder="Optional description"
      />
    </div>
    <div class="border-t-1 border-t-ccf-300">
      <PrimaryButton class="mt-4" @click.prevent="saveGroup"
        >Save</PrimaryButton
      >
      <PrimaryButton class="mt-4 ml-2" @click.prevent="emit('cancel')"
        >Cancel</PrimaryButton
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import type { CCFGroup, ErrorBody, ErrorResponse } from '@/stores/types';
import FormInput from '../forms/FormInput.vue';
import PrimaryButton from '../PrimaryButton.vue';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import { useToast } from 'primevue/usetoast';

const props = defineProps<{ group: CCFGroup }>();
const emit = defineEmits<{
  cancel: [];
  saved: [group: CCFGroup];
}>();

const toast = useToast();
const form = reactive({
  name: props.group.name,
  description: props.group.description ?? '',
});

const { data: updatedGroup, execute } = useDataApi<CCFGroup>(
  `/api/admin/groups/${props.group.id}`,
  { method: 'PUT', headers: { 'Content-Type': 'application/json' } },
  { immediate: false },
);

async function saveGroup() {
  if (!form.name.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Name required',
      detail: 'Please enter a group name.',
      life: 3000,
    });
    return;
  }
  try {
    await execute({ data: { name: form.name, description: form.description } });
    if (!updatedGroup.value) return;
    emit('saved', updatedGroup.value);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error updating group',
      detail:
        errorResponse.response?.data.errors.body ?? 'Unknown error occurred',
      life: 3000,
    });
  }
}
</script>
