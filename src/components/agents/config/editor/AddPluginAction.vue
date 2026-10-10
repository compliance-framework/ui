<template>
  <!-- relative: contains the absolutely positioned sr-only description (see PluginTabs). -->
  <span
    class="relative inline-flex items-center gap-1.5"
    data-test="add-plugin-action"
  >
    <span
      v-tooltip.top="{ value: tooltip, disabled: !disabled }"
      :tabindex="disabled ? 0 : undefined"
      :aria-label="disabled ? tooltip : undefined"
      data-test="add-plugin-wrapper"
    >
      <SecondaryButton
        size="small"
        :disabled="disabled"
        :aria-describedby="tooltip && !disabled ? descId : undefined"
        :data-state="access.state"
        data-test="add-plugin"
        @click="$emit('open')"
      >
        <i class="pi pi-plus mr-1" />Add plugin
      </SecondaryButton>
    </span>
    <i
      v-if="access.state === 'restricted'"
      v-tooltip.top="tooltip"
      role="img"
      tabindex="0"
      class="pi pi-shield text-xs text-amber-600 dark:text-amber-400"
      :aria-label="tooltip"
      data-test="add-plugin-restricted"
    />
    <span v-if="tooltip && !disabled" :id="descId" class="sr-only">{{
      tooltip
    }}</span>
  </span>
</template>

<script setup lang="ts">
// The "Add plugin" action with the R71 three states for a new plugin, before its source is
// known (field-access.ts addPluginAccess): no reporting instance could install one →
// disabled with the reasons; some → enabled with a shield; all (or no reporting instance
// yet) → enabled.
import { computed, useId } from 'vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
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

const descId = `add-plugin-${useId()}`;
const disabled = computed(
  () => props.access.state === 'readonly' || !!props.blockedReason,
);
const tooltip = computed(
  () => props.blockedReason || addPluginTooltip(props.access),
);
</script>
