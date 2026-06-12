<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { Dashboard } from '@/stores/filters';
import Label from '@/volt/Label.vue';
import Select from '@/volt/Select.vue';
import Message from '@/volt/Message.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';

defineProps<{
  dashboards: Dashboard[];
  isSubmitting?: boolean;
  serverError?: string;
}>();

const selectedDashboard = defineModel<Dashboard | null>('selectedDashboard', {
  required: true,
});

const emit = defineEmits<{
  submit: [];
  cancel: [];
}>();

const errors = reactive<Record<string, string>>({});

watch(selectedDashboard, () => {
  delete errors.dashboard;
});

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  if (!selectedDashboard.value) {
    errors.dashboard = 'Please select a dashboard.';
  }
  return Object.keys(errors).length === 0;
}

function submit() {
  if (!validate()) return;
  emit('submit');
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="submit">
    <div class="h-0.5 dark:bg-slate-800 bg-gray-400 w-full my-4"></div>
    <div class="flex justify-between items-center">
      <h4 class="m-0">Link Existing Dashboard</h4>
    </div>
    <div>
      <Label for="existing-dashboard" required>Select Dashboard</Label>
      <Select
        id="existing-dashboard"
        v-model="selectedDashboard"
        :options="dashboards"
        optionLabel="name"
        filter
        placeholder="Select a dashboard to link..."
        class="w-full"
        :invalid="!!errors.dashboard"
      />
      <small v-if="errors.dashboard" class="text-red-500">
        {{ errors.dashboard }}
      </small>
    </div>

    <Message v-if="serverError" severity="error">
      {{ serverError }}
    </Message>

    <div
      class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700"
    >
      <SecondaryButton type="button" @click="emit('cancel')">
        Cancel
      </SecondaryButton>
      <PrimaryButton type="submit" :disabled="isSubmitting">
        <i v-if="isSubmitting" class="pi pi-spin pi-spinner mr-2"></i>
        Link Dashboard
      </PrimaryButton>
    </div>
  </form>
</template>
