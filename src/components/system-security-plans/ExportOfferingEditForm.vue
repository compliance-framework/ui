<template>
  <form @submit.prevent="saveOffering" class="space-y-4">
    <div>
      <Label for="offering-edit-title" required>Title</Label>
      <InputText id="offering-edit-title" v-model="title" class="w-full" />
    </div>
    <div>
      <Label for="offering-edit-description">Description</Label>
      <Textarea
        id="offering-edit-description"
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
        {{ saving ? 'Saving...' : 'Save' }}
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

const props = defineProps<{
  sspId: string;
  offering: SSPExportOffering;
}>();
const emit = defineEmits<{
  cancel: [];
  saved: [offering: SSPExportOffering];
}>();

const toast = useToast();
const axiosInstance = useAuthenticatedInstance();

const title = ref(props.offering.title);
const description = ref(props.offering.description);
const saving = ref(false);

async function saveOffering() {
  if (!title.value.trim()) return;
  if (saving.value) return;
  saving.value = true;
  try {
    const response = await axiosInstance.put<DataResponse<SSPExportOffering>>(
      `/api/oscal/system-security-plans/${props.sspId}/export-offerings/${props.offering.id}`,
      { title: title.value.trim(), description: description.value },
    );
    toast.add({
      severity: 'success',
      summary: 'Export offering updated.',
      life: 3000,
    });
    emit('saved', response.data.data);
  } catch (error) {
    const errorResponse = error as AxiosError<ErrorResponse<ErrorBody>>;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail:
        errorResponse.response?.data?.errors?.body ||
        'Failed to update export offering.',
      life: 5000,
    });
  } finally {
    saving.value = false;
  }
}
</script>
