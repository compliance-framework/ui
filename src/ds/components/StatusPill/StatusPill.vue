<script setup lang="ts">
import Pill from '../Pill/Pill.vue';
import {
  statuses,
  type StatusKey,
  type StatusTone,
} from '../StatusBadge/statuses';

/**
 * A status as a small solid pill: its name on its tone's colour, e.g. an implementation status
 * after a component's name. Lighter than StatusBadge for dense rows, and the text names the status,
 * so it isn't colour alone. `tone` overrides the vocabulary's tone where a screen groups statuses
 * differently.
 */
defineProps<{ status: StatusKey; tone?: StatusTone }>();
</script>

<template>
  <Pill :label="statuses[status].label" :tone="tone ?? statuses[status].tone" />
</template>
