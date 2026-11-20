<script setup lang="ts">
import type { ByComponent } from '@/oscal';
import StatusPill from '@/ds/components/StatusPill/StatusPill.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { implementationStatus, implementationTone } from './controlParts';
import { useControlTree } from './controlTree';

/**
 * Each component's statement for (part of) a control: the component, its status as a pill beside its
 * name (green implemented, amber partial, blue otherwise) and its text.
 */
defineProps<{ byComponents: ByComponent[] }>();
const tree = useControlTree();
</script>

<template>
  <Stack as="ul" gap="4">
    <li v-for="bc in byComponents" :key="bc.uuid">
      <Stack gap="1">
        <Cluster gap="2">
          <Text as="strong">{{
            tree.component(bc.componentUuid)?.title ??
            'A component not in this plan'
          }}</Text>
          <StatusPill
            v-if="implementationStatus(bc)"
            :status="implementationStatus(bc)!"
            :tone="implementationTone(implementationStatus(bc)!)"
          />
        </Cluster>
        <Text preserve-whitespace>{{ bc.description }}</Text>
      </Stack>
    </li>
  </Stack>
</template>
