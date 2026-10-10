<template>
  <form @submit.prevent="createOffering" class="space-y-4">
    <div>
      <Label for="offering-title" required>Title</Label>
      <InputText id="offering-title" v-model="title" class="w-full" />
    </div>
    <div>
      <Label for="offering-description">Description</Label>
      <Textarea
        id="offering-description"
        v-model="description"
        rows="3"
        class="w-full"
      />
    </div>
    <div
      class="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-slate-700"
    >
      <SecondaryButton type="button" @click="$emit('cancel')">
        Cancel
      </SecondaryButton>
      <PrimaryButton type="submit" :disabled="!title.trim() || saving">
        {{ saving ? 'Creating...' : 'Create Offering' }}
      </PrimaryButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import Label from '@/volt/Label.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { useAuthenticatedInstance } from '@/composables/axios';
import type { DataResponse, ErrorBody, ErrorResponse } from '@/stores/types';
import type { SSPExportOffering } from '@/types/ssp-export-offerings';
import type { AxiosError } from 'axios';

const props = defineProps<{ sspId: string }>();
const emit = defineEmits<{
  cancel: [];
  created: [offering: SSPExportOffering];
}>();

const toast = useToast();
const axiosInstance = useAuthenticatedInstance();

const title = ref('');
const description = ref('');
const saving = ref(false);

async function createOffering() {
  if (!title.value.trim()) return;
  if (saving.value) return;
  saving.value = true;
  try {
    const response = await axiosInstance.post<DataResponse<SSPExportOffering>>(
      `/api/oscal/system-security-plans/${props.sspId}/export-offerings`,
      { title: title.value, description: description.value },
    );
    toast.add({
      severity: 'success',
      summary: 'Export offering created.',
      life: 3000,
    });
    emit('created', response.data.data);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        errorResponse.response?.data?.errors?.body ||
        'Failed to create export offering.',
      life: 5000,
    });
  } finally {
    saving.value = false;
  }
}
</script>
