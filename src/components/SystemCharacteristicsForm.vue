<script setup lang="ts">
import PrimaryButton from '@/components/PrimaryButton.vue';
import FormInput from '@/components/forms/FormInput.vue';
import {
  type SystemCharacteristics,
  useSystemSecurityPlanStore,
} from '@/stores/system-security-plans.ts';
import FormTextarea from '@/components/forms/FormTextarea.vue';
import { onMounted, ref } from 'vue'

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
  // TODO Add calls to update characteristics
  // sspStore.
  emit('updated', characteristics.value);
}

onMounted(() => {
  sspStore.getCharacteristics(props.systemSecurityPlanId).then((data) => {
    characteristics.value = data.data;
  });
})
</script>

<template>
  <form @submit.prevent="updateCharacteristics">
    <div class="mb-4">
      <label class="inline-block pb-2">System Name</label>
      <FormInput v-model="characteristics.systemName" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2">Short Name</label>
      <FormInput v-model="characteristics.systemNameShort" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2">Description</label>
      <FormTextarea class="field-sizing-content" v-model="characteristics.description" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2">Remarks</label>
      <FormTextarea class="field-sizing-content" v-model="characteristics.remarks" />
    </div>

    <div class="mb-4">
      <label class="inline-block pb-2">Sensitivity Level</label>
      <FormTextarea v-model="characteristics.securitySensitivityLevel" />
    </div>

    <PrimaryButton type="submit">Submit</PrimaryButton>
  </form>
</template>

<style scoped></style>
