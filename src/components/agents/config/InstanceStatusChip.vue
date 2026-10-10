<template>
  <ConfigPill
    :severity="state.severity"
    :data-state="state.state"
    :title="state.chipLabel"
  >
    <i v-if="state.problem" class="pi pi-exclamation-triangle text-[0.7rem]" />
    {{ state.chipLabel }}
  </ConfigPill>
</template>

<script setup lang="ts">
import ConfigPill from './ConfigPill.vue';
import type { InstanceUiState } from '@/utils/agent-config/instance-status';

defineProps<{ state: InstanceUiState }>();
</script>
