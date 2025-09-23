<template>
  <form @submit.prevent="emit('submit', step)">
    <div class="mb-4">
      <Label>UUID</Label>
      <InputText v-model="step.uuid" disabled class="block w-full mt-1" />
    </div>

    <div class="mb-4">
      <Label required>Title</Label>
      <InputText v-model="step.title" required class="block w-full mt-1" />
    </div>

    <div class="mb-4">
      <Label>Description</Label>
      <Textarea
        v-model="step.description"
        class="block w-full mt-1 field-sizing-content"
      />
    </div>

    <div class="mb-4">
      <Label>Remarks</Label>
      <Textarea
        v-model="step.remarks"
        class="block w-full mt-1 field-sizing-content"
      />
    </div>

    <div class="flex gap-2">
      <PrimaryButton type="submit">Save</PrimaryButton>
      <SecondaryButton type="button" @click="emit('cancel')"
        >Cancel</SecondaryButton
      >
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Step } from '@/oscal';
import PrimaryButton from '@/components/PrimaryButton.vue';
import SecondaryButton from '@/components/SecondaryButton.vue';
import Label from '@/volt/Label.vue';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';

const props = defineProps<{
  step: Step;
}>();

const emit = defineEmits<{
  submit: [step: Step];
  cancel: [];
}>();

const step = ref(props.step);
</script>
