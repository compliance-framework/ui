<script setup lang="ts">
import PrimaryButton from '@/volt/PrimaryButton.vue';
import FormInput from '@/components/forms/FormInput.vue';
import { type SystemCharacteristics } from '@/oscal';
import { useSystemSecurityPlanStore } from '@/stores/system-security-plans.ts';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import { onMounted, ref } from 'vue';

const sspStore = useSystemSecurityPlanStore();

const props = defineProps<{
  systemSecurityPlanId: string;
}>();

const characteristics = ref<SystemCharacteristics>({} as SystemCharacteristics);

const emit = defineEmits({
  updated(characteristics: SystemCharacteristics) {
    return !!characteristics.description;
  },
});

async function updateCharacteristics() {
  sspStore
    .updateCharacteristics(props.systemSecurityPlanId, characteristics.value)
    .then(() => {
      emit('updated', characteristics.value);
    });
}

onMounted(() => {
  sspStore
    .getCharacteristics(props.systemSecurityPlanId)
    .then((data) => {
      characteristics.value = data.data;
    })
    .catch(async () => {
      emit('updated', {} as SystemCharacteristics);
    });
});
</script>

<template>
  <form @submit.prevent="updateCharacteristics">
    <div class="grid grid-cols-12 gap-y-4 items-start">
      <label class="inline-block pt-2">System Name</label>
      <div class="col-span-11">
        <FormInput
          v-model="characteristics.systemName"
          class="field-sizing-content"
        />
      </div>

      <label class="inline-block pt-2">Short Name</label>
      <div class="col-span-11">
        <FormInput
          v-model="characteristics.systemNameShort"
          class="field-sizing-content"
        />
      </div>

      <label class="inline-block pt-2">Sensitivity Level</label>
      <div class="col-span-11">
        <FormInput
          v-model="characteristics.securitySensitivityLevel"
          class="field-sizing-content"
        />
      </div>

      <label class="inline-block pt-2">Description</label>
      <div class="col-span-11">
        <FormTextarea
          v-model="characteristics.description"
          class="field-sizing-content"
        />
      </div>

      <label class="inline-block pt-2">Remarks</label>
      <div class="col-span-11">
        <FormTextarea
          v-model="characteristics.remarks"
          class="field-sizing-content"
        />
      </div>
    </div>

    <PrimaryButton type="submit">Submit</PrimaryButton>
  </form>
</template>
