<template>
  <div class="px-12 py-8">
    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Name</label>
      <FormInput v-model="group.name" placeholder="Group name" required />
    </div>
    <div class="mb-4">
      <label class="inline-block pb-2 dark:text-slate-300">Description</label>
      <FormInput
        v-model="group.description"
        placeholder="Optional description"
      />
    </div>
    <div class="border-t-1 border-t-ccf-300">
      <PrimaryButton class="mt-4" @click.prevent="createGroup">
        Save Group
      </PrimaryButton>
      <SecondaryButton class="mt-4 ml-2" @click.prevent="emit('cancel')">
        Cancel
      </SecondaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type {
  CCFGroup,
  CCFGroupCreate,
  ErrorBody,
  ErrorResponse,
} from '@/stores/types';
import FormInput from '../forms/FormInput.vue';
import PrimaryButton from '../PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { useDataApi } from '@/composables/axios';
import type { AxiosError } from 'axios';
import { useToast } from 'primevue/usetoast';

const emit = defineEmits<{
  cancel: [];
  create: [group: CCFGroup];
}>();

const toast = useToast();
const group = ref<CCFGroupCreate>({ name: '', description: '' });

const { data: createdGroup, execute } = useDataApi<CCFGroup>(
  '/api/admin/groups',
  { method: 'POST', headers: { 'Content-Type': 'application/json' } },
  { immediate: false },
);

async function createGroup() {
  if (!group.value.name.trim()) {
    toast.add({
      severity: 'warn',
      summary: 'Name required',
      detail: 'Please enter a group name.',
      life: 3000,
    });
    return;
  }
  try {
    await execute({ data: group.value });
    if (!createdGroup.value) return;
    emit('create', createdGroup.value);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error creating group',
      detail:
        errorResponse.response?.data.errors.body ?? 'Unknown error occurred',
      life: 3000,
    });
  }
}
</script>
