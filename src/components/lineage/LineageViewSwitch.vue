<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import SelectButton from '@/volt/SelectButton.vue';

const props = defineProps<{ active: 'tree' | 'graph' }>();

const router = useRouter();

const options = [
  { label: 'Tree', value: 'tree', route: 'lineage' },
  { label: 'Graph', value: 'graph', route: 'lineage-graph' },
];

const model = computed({
  get: () => props.active,
  set: (value: 'tree' | 'graph') => {
    if (!value || value === props.active) return;
    const target = options.find((o) => o.value === value);
    if (target) router.push({ name: target.route });
  },
});
</script>

<template>
  <SelectButton
    v-model="model"
    :options="options"
    optionLabel="label"
    optionValue="value"
    :allowEmpty="false"
    aria-label="Toggle tree or graph view"
  />
</template>
