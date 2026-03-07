<template>
  <VoltButton severity="secondary" v-bind="$attrs">
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </VoltButton>
</template>

<script setup lang="ts">
import VoltButton from './Button.vue';
</script>
