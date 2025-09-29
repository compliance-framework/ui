<template>
  <form @submit.prevent="emit('submit', step)">
    <div class="mb-4">
      <Label>UUID</Label>
      <div class="flex items-center place-items-stretch">
        <InputText
          v-model="step.uuid"
          disabled
          class="rounded-r-none border-r-0 grow"
        />
        <SecondaryButton
          type="button"
          @click="generateUuid"
          class="py-3 rounded-l-none"
          ><BIconArrowRepeat
        /></SecondaryButton>
      </div>
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
import PrimaryButton from '@/volt/PrimaryButton.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Label from '@/volt/Label.vue';
import InputText from '@/volt/InputText.vue';
import Textarea from '@/volt/Textarea.vue';
import { v4 as uuidv4 } from 'uuid';

const emit = defineEmits<{
  submit: [step: Step];
  cancel: [];
}>();

const step = ref<Step>({
  uuid: uuidv4(),
} as Step);

function generateUuid() {
  step.value.uuid = uuidv4();
}
</script>
