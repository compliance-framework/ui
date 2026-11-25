<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { ByComponentSatisfy } from '@/oscal';
import { statuses } from '@/ds/components/StatusBadge/statuses';
import Pill from '@/ds/components/Pill/Pill.vue';
import Text from '@/ds/components/Text/Text.vue';
import TextLink from '@/ds/components/TextLink/TextLink.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import Stack from '@/ds/components/layout/Stack.vue';
import type { InheritedImplementation } from './useInheritedImplementations';

/**
 * The part of a control's implementation this system inherits, read-only, in place of a
 * component's statement: the upstream system it comes from (a link to its implementation of the
 * control), the offering and, unless the link is active, how it stands; what the upstream system
 * provides; then each responsibility it leaves to this system, met (this system says how it meets
 * it) or not met, with its evidence when there is any, and this system's note on it when that adds
 * to the responsibility's own text. The control stays this system's: only the implementation is
 * inherited.
 */
const props = defineProps<{
  inherited: InheritedImplementation;
  /** The upstream system's name. */
  name: string;
  /** Its implementation of the control. */
  to?: RouteLocationRaw;
  /** This system's notes on the responsibilities it meets. */
  satisfied?: ByComponentSatisfy[];
}>();

const LINK_STATUS = {
  drifted: { label: 'Drifted', tone: 'warning' },
  revoked: { label: 'Revoked', tone: 'error' },
  superseded: { label: 'Superseded', tone: 'neutral' },
} as const;
const linkStatus = computed(() =>
  props.inherited.status === 'active'
    ? undefined
    : LINK_STATUS[props.inherited.status],
);

const responsibilities = computed(() =>
  props.inherited.responsibilities.map((r) => {
    const note = props.satisfied?.find(
      (s) => s.responsibilityUuid === r.uuid,
    )?.description;
    return {
      ...r,
      note: note && note.trim() !== r.description.trim() ? note : '',
      evidence:
        r.evidence === 'unknown'
          ? undefined
          : {
              label: `Evidence: ${statuses[r.evidence].label.toLowerCase()}`,
              tone: statuses[r.evidence].tone,
            },
    };
  }),
);
</script>

<template>
  <Stack gap="2">
    <Stack gap="1">
      <Cluster gap="2">
        <Text as="strong"
          >Inherited from <TextLink v-if="to" :to="to">{{ name }}</TextLink
          ><template v-else>{{ name }}</template></Text
        >
        <Pill
          v-if="linkStatus"
          :label="linkStatus.label"
          :tone="linkStatus.tone"
        />
      </Cluster>
      <Text variant="caption"
        >Through {{ inherited.offeringTitle }}, version
        {{ inherited.offeringVersion }}</Text
      >
      <Text v-if="inherited.provided" preserve-whitespace>{{
        inherited.provided
      }}</Text>
    </Stack>
    <Stack
      v-for="responsibility in responsibilities"
      :key="responsibility.uuid"
      gap="1"
    >
      <Cluster gap="2">
        <Text as="span" variant="label">Your responsibility</Text>
        <Pill
          :label="responsibility.met ? 'Met' : 'Not met'"
          :tone="responsibility.met ? 'success' : 'warning'"
        />
        <Pill
          v-if="responsibility.evidence"
          :label="responsibility.evidence.label"
          :tone="responsibility.evidence.tone"
        />
      </Cluster>
      <Text preserve-whitespace>{{ responsibility.description }}</Text>
      <Text v-if="responsibility.note" variant="secondary" italic>{{
        responsibility.note
      }}</Text>
    </Stack>
  </Stack>
</template>
