<template>
  <ConfigPill
    :severity="severity"
    :data-provenance="provenance"
    :title="PROVENANCE_LABELS[provenance]"
  >
    {{ PROVENANCE_LABELS[provenance] }}
  </ConfigPill>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ConfigPill from './ConfigPill.vue';
import {
  PROVENANCE_LABELS,
  type Provenance,
} from '@/utils/agent-config/provenance';

const props = defineProps<{ provenance: Provenance }>();

const severity = computed(() => {
  switch (props.provenance) {
    case 'overlay':
      return 'info' as const;
    case 'overrides-file':
      return 'warn' as const;
    case 'removed-by-overlay':
      return 'danger' as const;
    default:
      return 'secondary' as const;
  }
});
</script>
