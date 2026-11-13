<script setup lang="ts">
import Icon from '../Icon/Icon.vue';
import type { MessageTone } from './tone';

/**
 * A message shown where the event happened: a form section, a panel, a failed load (F-13 AC1,
 * AC6; F-14 AC1; P5). Icon + text in the tone's colours, never colour alone. Errors are
 * role="alert", other tones role="status". It never auto-dismisses. Actions sit beside the text
 * and wrap below it when space runs out; the `dismiss` slot is used by PageBanner.
 */
withDefaults(defineProps<{ tone: MessageTone; title?: string }>(), {
  title: undefined,
});
</script>

<template>
  <div
    class="inline-message"
    :class="`inline-message--${tone}`"
    :role="tone === 'error' ? 'alert' : 'status'"
  >
    <Icon :name="tone" class="inline-message__icon" />
    <div class="inline-message__content">
      <div class="inline-message__text">
        <p v-if="title" class="inline-message__title">{{ title }}</p>
        <div v-if="$slots.default" class="inline-message__body"><slot /></div>
      </div>
      <div v-if="$slots.actions" class="inline-message__actions">
        <slot name="actions" />
      </div>
    </div>
    <slot name="dismiss" />
  </div>
</template>

<style scoped>
.inline-message {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-3);
  min-width: 0;
  padding: var(--ds-space-3) var(--ds-space-4);
  background: var(--tone-bg);
  color: var(--ds-color-text-primary);
  border-inline-start: var(--ds-border-width-indicator) solid var(--tone-fg);
  border-radius: var(--ds-radius-none);
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-leading-body);
}

.inline-message--info {
  --tone-fg: var(--ds-color-status-info-fg);
  --tone-bg: var(--ds-color-status-info-bg);
}

.inline-message--success {
  --tone-fg: var(--ds-color-status-success-fg);
  --tone-bg: var(--ds-color-status-success-bg);
}

.inline-message--warning {
  --tone-fg: var(--ds-color-status-warning-fg);
  --tone-bg: var(--ds-color-status-warning-bg);
}

.inline-message--error {
  --tone-fg: var(--ds-color-status-error-fg);
  --tone-bg: var(--ds-color-status-error-bg);
}

.inline-message__icon {
  /* centre the icon on the first line of text */
  margin-block-start: calc(
    (
        var(--ds-font-size-body) * var(--ds-leading-body) -
          var(--ds-size-icon-md)
      ) /
      2
  );
  color: var(--tone-fg);
}

.inline-message__content {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-3) var(--ds-space-4);
  min-width: 0;
}

.inline-message__text {
  display: flex;
  flex: 1 1 var(--ds-width-column-md);
  flex-direction: column;
  gap: var(--ds-space-1);
  min-width: 0;
}

.inline-message__title {
  color: var(--tone-fg);
  font-weight: var(--ds-font-weight-bold);
}

.inline-message__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-2);
}
</style>
