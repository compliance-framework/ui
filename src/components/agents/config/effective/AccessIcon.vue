<template>
  <i
    v-if="icon"
    v-tooltip.top="text"
    role="img"
    tabindex="0"
    class="pi text-xs"
    :class="icon"
    :aria-label="text"
    :data-test="testId ?? `field-${state}`"
  />
</template>

<script setup lang="ts">
// The R71 access hint next to a field (utils/agent-config/field-access.ts): a shield where only
// some reporting instances would apply a change, an info icon where none would, a lock for a
// locked key. With `blocked`, "none would" is a red ban instead (a plugin no instance would
// install). Nothing is shown for an editable field.
import { computed } from 'vue';
import type { FieldState } from '@/utils/agent-config/field-access';

const props = defineProps<{
  state: FieldState | null | undefined;
  /** Tooltip and accessible name. */
  text: string;
  /** Defaults to `field-<state>`. */
  testId?: string;
  blocked?: boolean;
}>();

const ICONS: Partial<Record<FieldState, string>> = {
  restricted: 'pi-shield text-amber-600 dark:text-amber-400',
  readonly: 'pi-info-circle text-gray-400 dark:text-slate-500',
  forbidden: 'pi-lock text-gray-400 dark:text-slate-500',
};

const icon = computed(() => {
  if (!props.state) return '';
  if (props.state === 'readonly' && props.blocked) {
    return 'pi-ban text-red-600 dark:text-red-400';
  }
  return ICONS[props.state] ?? '';
});
</script>
