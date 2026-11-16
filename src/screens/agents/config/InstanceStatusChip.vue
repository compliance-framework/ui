<script setup lang="ts">
import { computed } from 'vue';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import type { StatusKey } from '@/ds/components/StatusBadge/statuses';
import type {
  InstanceUiState,
  InstanceUiStateName,
} from '@/utils/agent-config/instance-status';

// An instance's sync state, labelled with its revision (e.g. "Pending r6 → r7").
const props = defineProps<{ state: InstanceUiState }>();

const KEYS: Record<InstanceUiStateName, StatusKey> = {
  'in-sync': 'config-in-sync',
  pending: 'config-pending',
  'report-only': 'config-report-only',
  'not-reported': 'config-not-reported',
  'rejected-unsafe': 'config-rejected',
  'rejected-forbidden': 'config-rejected',
  'rejected-invalid': 'config-rejected',
  failed: 'config-failed',
  unknown: 'config-unknown',
};
const status = computed(() => KEYS[props.state.state] ?? 'config-unknown');
</script>

<template>
  <StatusBadge
    :status="status"
    :label="state.chipLabel"
    :data-state="state.state"
  />
</template>
