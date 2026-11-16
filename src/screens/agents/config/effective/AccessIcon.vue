<script setup lang="ts">
// The R71 access note next to a field (utils/agent-config/field-access.ts): a warning where only
// some reporting instances would apply a change, an info note where none would, a lock for a
// locked key. With `blocked`, "none would" is a "not allowed" note instead (a plugin no instance
// would install). Nothing is shown for an editable field. The note opens on hover, focus or tap.
import { computed } from 'vue';
import InfoTip from '@/ds/components/InfoTip/InfoTip.vue';
import type { IconName } from '@/ds/components/Icon/icons';
import type { FieldState } from '@/utils/agent-config/field-access';

const props = defineProps<{
  state: FieldState | null | undefined;
  /** The note, and the accessible name. */
  text: string;
  /** Defaults to `field-<state>`. */
  testId?: string;
  blocked?: boolean;
}>();

type Look = { icon: IconName; tone: 'neutral' | 'warning' | 'error' };
const LOOKS: Partial<Record<FieldState, Look>> = {
  restricted: { icon: 'warning', tone: 'warning' },
  readonly: { icon: 'info', tone: 'neutral' },
  forbidden: { icon: 'locked', tone: 'neutral' },
};

const look = computed<Look | null>(() => {
  if (!props.state) return null;
  if (props.state === 'readonly' && props.blocked)
    return { icon: 'forbidden', tone: 'error' };
  return LOOKS[props.state] ?? null;
});
</script>

<template>
  <InfoTip
    v-if="look"
    :text="text"
    :icon="look.icon"
    :tone="look.tone"
    :data-test="testId ?? `field-${state}`"
  />
</template>
