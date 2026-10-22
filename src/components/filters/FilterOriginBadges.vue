<template>
  <span
    v-if="followsScope || automatic"
    class="inline-flex items-center gap-1 align-middle"
  >
    <Badge
      v-if="followsScope"
      value="Follows scope"
      severity="info"
      data-testid="badge-follows-scope"
    />
    <Badge
      v-if="automatic"
      value="Automatic"
      severity="secondary"
      data-testid="badge-automatic"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Badge from '@/volt/Badge.vue';
import type { Dashboard } from '@/stores/filters';

// Marks a filter that follows its SSP's scope (it has a scopeBase) and an automatic
// per-policy filter (origin "scope-policy").
const props = defineProps<{
  filter: Pick<Dashboard, 'scopeBase' | 'origin'>;
}>();

const followsScope = computed(() => !!props.filter.scopeBase);
const automatic = computed(() => props.filter.origin === 'scope-policy');
</script>
