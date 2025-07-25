<script setup lang="ts">
import type { Statement } from '@/oscal'
import StatementByComponent from '@/views/control-implementations/partials/StatementByComponent.vue'

defineProps<{
  statement: Statement
}>();

</script>

<template>
  <h4 class="font-medium mb-4">Implemented by Components</h4>
  <div v-for="byComponent in statement.byComponents || []" :key="byComponent.uuid" class="mb-4">
    <StatementByComponent :by-component="byComponent" />
  </div>
</template>

<style scoped>

</style>
