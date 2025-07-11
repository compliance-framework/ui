<template>
  <SystemCharacteristicsForm :system-security-plan-id="id" @updated="handleUpdate"/>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import SystemCharacteristicsForm from '@/components/SystemCharacteristicsForm.vue'
import { useToast } from 'primevue/usetoast';
import type { SystemCharacteristics } from '@/stores/system-security-plans.ts';

const route = useRoute();
const id = ref<string>(route.params.id as string);
const toast = useToast();


function handleUpdate(characteristics?: SystemCharacteristics) {
  if (!characteristics) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Error in saving System Security Plan characteristics.',
      life: 3000
    });
  } else {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'System Security Plan characteristics updated successfully.',
      life: 3000
    });
  }
}

</script>
