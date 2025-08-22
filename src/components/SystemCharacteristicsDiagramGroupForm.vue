<script setup lang="ts">
import PrimaryButton from '@/components/PrimaryButton.vue';
import { type DiagramGrouping } from '@/stores/system-security-plans.ts';
import FormTextarea from '@/components/forms/FormTextarea.vue';

const model = defineModel<DiagramGrouping>({ required: true });

const emit = defineEmits({
  updated(grouping: DiagramGrouping) {
    return !!grouping.description;
  },
});

async function updateCharacteristics() {
  emit('updated', model.value as DiagramGrouping);
}
</script>

<template>
  <form @submit.prevent="updateCharacteristics">
    <div class="grid grid-cols-12 gap-y-4 items-start">
      <label class="inline-block pt-2">Description</label>
      <div class="col-span-11">
        <FormTextarea
          v-model="model.description"
          class="field-sizing-content"
        />
      </div>

      <label class="inline-block pt-2">Remarks</label>
      <div class="col-span-11">
        <FormTextarea v-model="model.remarks" class="field-sizing-content" />
      </div>
    </div>

    <PrimaryButton type="submit">Submit</PrimaryButton>
  </form>
</template>
