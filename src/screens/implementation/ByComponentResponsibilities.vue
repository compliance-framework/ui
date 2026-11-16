<script setup lang="ts">
/**
 * What one component statement shares: what it provides to systems that import it, what it leaves
 * to them, and what it inherits from upstream. Satisfied entries are left out on purpose: they are
 * the downstream's "how we handle this" notes, shown under Inherited responsibilities.
 */
import { computed } from 'vue';
import type { ByComponent } from '@/oscal';
import Text from '@/ds/components/Text/Text.vue';
import Stack from '@/ds/components/layout/Stack.vue';

const props = defineProps<{ byComponent: ByComponent }>();

const groups = computed(() =>
  [
    {
      key: 'provided',
      label: 'Provides',
      items: props.byComponent.export?.provided ?? [],
    },
    {
      key: 'responsibilities',
      label: 'Leaves to the systems that import it',
      items: props.byComponent.export?.responsibilities ?? [],
    },
    {
      key: 'inherited',
      label: 'Inherits',
      items: props.byComponent.inherited ?? [],
    },
  ].filter((group) => group.items.length),
);
</script>

<template>
  <Stack v-if="groups.length" gap="3">
    <Stack v-for="group in groups" :key="group.key" gap="1">
      <Text as="span" variant="label">{{ group.label }}</Text>
      <Stack as="ul" gap="1">
        <li v-for="item in group.items" :key="item.uuid">
          <Text>{{ item.description }}</Text>
        </li>
      </Stack>
    </Stack>
  </Stack>
</template>
