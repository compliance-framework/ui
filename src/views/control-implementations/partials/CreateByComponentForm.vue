<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { SelectOption } from './form-options';
import Label from '@/volt/Label.vue';
import Select from '@/volt/Select.vue';
import Textarea from '@/volt/Textarea.vue';
import Message from '@/volt/Message.vue';
import Button from '@/volt/Button.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';

defineProps<{
  componentItems: SelectOption[];
  statusOptions: SelectOption[];
  componentsLoading: boolean;
  isSubmitting?: boolean;
  serverError?: string;
}>();

const selectedComponent = defineModel<SelectOption | null>(
  'selectedComponent',
  {
    required: true,
  },
);
const description = defineModel<string | undefined>('description', {
  required: true,
});
const statusState = defineModel<string>('statusState', { required: true });
const statusRemarks = defineModel<string>('statusRemarks', { required: true });

const emit = defineEmits<{
  submit: [];
  cancel: [];
  createComponent: [];
}>();

const errors = reactive<Record<string, string>>({});

watch(selectedComponent, () => {
  delete errors.component;
});

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);
  if (!selectedComponent.value?.value) {
    errors.component = 'Please select a valid component.';
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
      <h4 class="m-0">New Component Implementation</h4>
      <Button
        type="button"
        label="Create New"
        class="!text-xs !py-1 !px-2 !text-blue-600 hover:!text-blue-800 dark:!text-blue-400"
        severity="secondary"
        text
        @click="emit('createComponent')"
      />
    </div>

    <div>
      <Label for="component-implementation-component" required>
        Component
      </Label>
      <Select
        id="component-implementation-component"
        v-model="selectedComponent"
        placeholder="Select a component"
        :loading="componentsLoading"
        checkmark
        class="w-full"
        :options="componentItems"
        optionLabel="name"
        :invalid="!!errors.component"
      />
      <small v-if="errors.component" class="text-red-500">
        {{ errors.component }}
      </small>
    </div>

    <div>
      <Label for="component-implementation-description">Description</Label>
      <Textarea
        id="component-implementation-description"
        v-model="description"
        rows="5"
        cols="30"
        class="resize-none w-full"
        placeholder="Description"
        @keyup.ctrl.enter="submit"
      />
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div>
        <Label for="component-implementation-status">
          Implementation Status
        </Label>
        <Select
          id="component-implementation-status"
          v-model="statusState"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>
      <div>
        <Label for="component-implementation-status-remarks">
          Status Remarks
        </Label>
        <Textarea
          id="component-implementation-status-remarks"
          v-model="statusRemarks"
          rows="2"
          class="resize-none w-full"
          :disabled="!statusState"
          placeholder="Implementation status remarks"
        />
      </div>
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
      <PrimaryButton
        type="submit"
        :disabled="isSubmitting"
        v-tooltip.bottom="'ctrl + enter to create'"
      >
        <i v-if="isSubmitting" class="pi pi-spin pi-spinner mr-2"></i>
        Create
      </PrimaryButton>
    </div>
  </form>
</template>
