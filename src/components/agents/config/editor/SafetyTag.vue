<template>
  <ConfigPill :severity="severity" :data-safety="kind">{{ label }}</ConfigPill>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ConfigPill from '../ConfigPill.vue';
import type { SafetyTagKind } from './review';

const props = defineProps<{ kind: SafetyTagKind }>();

const severity = computed(
  () =>
    (
      ({
        safe: 'success',
        unsafe: 'warn',
        forbidden: 'danger',
        'no-effect': 'secondary',
      }) as const
    )[props.kind],
);
const label = computed(
  () =>
    ({
      safe: 'safe',
      unsafe: 'needs apply_all',
      forbidden: 'forbidden',
      'no-effect': 'no effect vs file',
    })[props.kind],
);
</script>
