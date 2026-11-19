<script setup lang="ts">
import type { ByComponent } from '@/oscal';
import StatusBadge from '@/ds/components/StatusBadge/StatusBadge.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { implementationStatus } from './controlParts';
import { useControlTree } from './controlTree';

/** Each component's statement for (part of) a control: the component, its status and its text. */
defineProps<{ byComponents: ByComponent[] }>();
const tree = useControlTree();
</script>

<template>
  <Stack as="ul" gap="4">
    <li v-for="bc in byComponents" :key="bc.uuid">
      <Stack gap="1">
        <Cluster gap="2" justify="between">
          <Text as="strong">{{
            tree.component(bc.componentUuid)?.title ??
            'A component not in this plan'
          }}</Text>
          <StatusBadge
            v-if="implementationStatus(bc)"
            :status="implementationStatus(bc)!"
          />
        </Cluster>
        <Text preserve-whitespace>{{ bc.description }}</Text>
      </Stack>
    </li>
  </Stack>
</template>
