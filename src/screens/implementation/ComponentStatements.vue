<script setup lang="ts">
import type { ByComponent } from '@/oscal';
import Pill from '@/ds/components/Pill/Pill.vue';
import StatusPill from '@/ds/components/StatusPill/StatusPill.vue';
import Text from '@/ds/components/Text/Text.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import { implementationStatus, implementationTone } from './controlParts';
import { useControlTree } from './controlTree';

/**
 * Each component's statement for (part of) a control: the component, its status as a pill beside its
 * name (green implemented, amber partial, blue otherwise), an "Evidence" pill when an evidence
 * filter is linked to both the control and the component, and its text. The API links filters to
 * controls and components, not to a statement, so the evidence pill is the same on every part a
 * component implements.
 */
const props = defineProps<{ controlId: string; byComponents: ByComponent[] }>();
const tree = useControlTree();

/** How many of the control's evidence filters are also linked to this component. */
const evidenceCount = (componentUuid: string) =>
  tree
    .filters(props.controlId)
    .filter((f) => f.components?.some((c) => c.uuid === componentUuid)).length;
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
          <Pill
            v-if="evidenceCount(bc.componentUuid)"
            :label="
              evidenceCount(bc.componentUuid) > 1
                ? `Evidence (${evidenceCount(bc.componentUuid)} filters)`
                : 'Evidence'
            "
          />
        </Cluster>
        <Text preserve-whitespace>{{ bc.description }}</Text>
      </Stack>
    </li>
  </Stack>
</template>
