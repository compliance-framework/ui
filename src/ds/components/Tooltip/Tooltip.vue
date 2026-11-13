<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  TooltipContent,
  TooltipPortal,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui';

/**
 * Short supplementary text that opens on hover and keyboard focus, and can be opened
 * programmatically (v-model:open) for touch, e.g. when a disabled control is tapped (F-19 AC3).
 * Never the only place essential information lives.
 */
withDefaults(
  defineProps<{ text: string; side?: 'top' | 'right' | 'bottom' | 'left' }>(),
  { side: 'top' },
);
const open = defineModel<boolean>('open', { default: false });
const trigger = ref<InstanceType<typeof TooltipTrigger>>();
const portalTarget = computed(() => {
  if (!open.value) return undefined;
  const element = trigger.value?.$el;
  const landmark =
    element instanceof HTMLElement
      ? element.closest<HTMLElement>(
          '[role="dialog"], [role="alertdialog"], main, nav, header, footer, [role="region"]',
        )
      : undefined;
  // The shell-owned host keeps page teleports outside route fragment insertion anchors.
  return (
    landmark?.querySelector<HTMLElement>(':scope > [data-tooltip-portal]') ??
    landmark ??
    document.body
  );
});
</script>

<template>
  <TooltipRoot v-model:open="open" :delay-duration="300">
    <TooltipTrigger ref="trigger" as-child>
      <slot />
    </TooltipTrigger>
    <TooltipPortal :to="portalTarget">
      <!-- as-child: reka's content wrapper drops scoped attributes, so the styled element is ours. -->
      <TooltipContent
        as-child
        :aria-label="text"
        :side="side"
        :side-offset="6"
        :collision-padding="8"
      >
        <div class="tooltip" aria-hidden="true">{{ text }}</div>
      </TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>

<style scoped>
.tooltip {
  z-index: var(--ds-z-tooltip);
  max-width: min(
    var(--ds-width-dialog-s),
    var(--reka-tooltip-content-available-width)
  );
  padding: var(--ds-space-1) var(--ds-space-2);
  background: var(--ds-color-text-primary);
  color: var(--ds-color-text-inverse);
  font-family: var(--ds-font-ui);
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-snug);
  overflow-wrap: anywhere;
  border-radius: var(--ds-radius-none);
  box-shadow: var(--ds-shadow-raised);
}
</style>
