<script setup lang="ts">
// The "Add plugin" action with the R71 three states for a new plugin, before its source is
// known (field-access.ts addPluginAccess): no reporting instance could install one →
// unavailable, with the reasons; some → available with a warning note; all (or no reporting
// instance yet) → available.
import { computed } from 'vue';
import Button from '@/ds/components/Button/Button.vue';
import InfoTip from '@/ds/components/InfoTip/InfoTip.vue';
import Cluster from '@/ds/components/layout/Cluster.vue';
import {
  addPluginTooltip,
  type FieldAccess,
} from '@/utils/agent-config/field-access';

const props = defineProps<{
  access: FieldAccess;
  /** Why adding waits regardless of R71 (e.g. instance files still loading); '' = it does not. */
  blockedReason?: string;
}>();
defineEmits<{ open: [] }>();

const tooltip = computed(
  () => props.blockedReason || addPluginTooltip(props.access),
);
/** Why the action is unavailable, or undefined when it is available. */
const disabledReason = computed(() =>
  props.access.state === 'readonly' || props.blockedReason
    ? tooltip.value || 'No reporting instance would install a new plugin.'
    : undefined,
);
</script>

<template>
  <Cluster gap="1" as="span" data-test="add-plugin-action">
    <Button
      size="sm"
      icon="add"
      :disabled-reason="disabledReason"
      :data-state="access.state"
      data-test="add-plugin"
      @click="$emit('open')"
      >Add plugin</Button
    >
    <InfoTip
      v-if="access.state === 'restricted'"
      icon="warning"
      tone="warning"
      :text="addPluginTooltip(access)"
      data-test="add-plugin-restricted"
    />
  </Cluster>
</template>
