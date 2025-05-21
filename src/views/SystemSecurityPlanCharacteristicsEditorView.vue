<template>
  <SystemCharacteristicsForm :system-security-plan-id="id" />
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import SystemCharacteristicsForm from '@/components/SystemCharacteristicsForm.vue'

const route = useRoute();
const id = ref<string>(route.params.id as string);

</script>
