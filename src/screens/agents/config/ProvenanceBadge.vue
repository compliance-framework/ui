<script setup lang="ts">
import { computed } from 'vue';
import Tag from '@/ds/components/Tag/Tag.vue';
import {
  PROVENANCE_LABELS,
  type Provenance,
} from '@/utils/agent-config/provenance';

// Where a value comes from: the overlay, the overlay overriding the file, or removed by it.
const props = defineProps<{ provenance: Provenance }>();

const label = computed(() => {
  const text = PROVENANCE_LABELS[props.provenance];
  return text.charAt(0).toUpperCase() + text.slice(1);
});
</script>

<template>
  <Tag :label="label" :data-provenance="provenance" />
</template>
