<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { TooltipProvider } from 'reka-ui';
import { bridgePrimeVueToasts, dismissToast, toasts } from '../../toasts';
import Icon from '../Icon/Icon.vue';
import IconButton from '../IconButton/IconButton.vue';

/**
 * The one toast region (F-13 AC4, AC5; P5), mounted once in App. It sits bottom-right inside the
 * page padding, stacks upward and never reaches the header. Success and info go to a polite live
 * region, warnings and errors to an assertive role="alert" region; both stay in the DOM so new
 * toasts are announced. It also shows toasts raised through PrimeVue's `useToast()`.
 */
// role="alert" is assertive and role="status" polite; aria-atomic="false" reads only the new toast.
const groups = computed(() => [
  {
    role: 'alert',
    items: toasts.filter((t) => t.tone === 'warning' || t.tone === 'error'),
  },
  {
    role: 'status',
    items: toasts.filter((t) => t.tone === 'success' || t.tone === 'info'),
  },
]);

let unbridge: (() => void) | undefined;
onMounted(() => (unbridge = bridgePrimeVueToasts()));
onBeforeUnmount(() => unbridge?.());
</script>

<template>
  <!-- Outside AppShell (and on guest pages), so it provides tooltips for its buttons itself. -->
  <TooltipProvider>
    <section class="toast-region" aria-label="App notifications" data-scroll>
      <div
        v-for="group in groups"
        :key="group.role"
        :role="group.role"
        :aria-live="group.role === 'alert' ? 'assertive' : 'polite'"
        aria-atomic="false"
      >
        <div
          v-for="toast in group.items"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.tone}`"
        >
          <Icon :name="toast.tone" class="toast__icon" />
          <div class="toast__text">
            <p class="toast__title">{{ toast.title }}</p>
            <p v-if="toast.message" class="toast__message">
              {{ toast.message }}
            </p>
          </div>
          <IconButton
            icon="close"
            size="sm"
            :label="`Dismiss: ${toast.title}`"
            @click="dismissToast(toast.id)"
          />
        </div>
      </div>
    </section>
  </TooltipProvider>
</template>

<style scoped>
.toast-region {
  position: fixed;
  inset-block-end: var(--ds-space-page-x);
  inset-inline-end: var(--ds-space-page-x);
  z-index: var(--ds-z-toast);
  width: min(var(--ds-width-dialog-s), calc(100% - 2 * var(--ds-space-page-x)));
  /* percentages resolve against the viewport for fixed elements: never reach the header */
  max-height: calc(100% - var(--ds-height-header) - 2 * var(--ds-space-page-x));
  overflow-y: auto;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--ds-space-3);
  margin-block-start: var(--ds-space-2);
  padding: var(--ds-space-3) var(--ds-space-2) var(--ds-space-3)
    var(--ds-space-4);
  background: var(--ds-color-surface-overlay);
  color: var(--ds-color-text-primary);
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  border-inline-start: var(--ds-border-width-indicator) solid var(--tone-fg);
  border-radius: var(--ds-radius-none);
  box-shadow: var(--ds-shadow-raised);
  font-family: var(--ds-font-ui);
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-leading-body);
  pointer-events: auto;
  animation: toast-in var(--ds-duration-base) var(--ds-ease-standard);
}

.toast--success {
  --tone-fg: var(--ds-color-status-success-fg);
}

.toast--info {
  --tone-fg: var(--ds-color-status-info-fg);
}

.toast--warning {
  --tone-fg: var(--ds-color-status-warning-fg);
}

.toast--error {
  --tone-fg: var(--ds-color-status-error-fg);
}

.toast__icon {
  flex: none;
  margin-block-start: calc(
    (
        var(--ds-font-size-body) * var(--ds-leading-body) -
          var(--ds-size-icon-md)
      ) /
      2
  );
  color: var(--tone-fg);
}

.toast__text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--ds-space-1);
  min-width: 0;
  overflow-wrap: anywhere;
}

.toast__title,
.toast__message {
  margin: 0;
}

.toast__title {
  font-weight: var(--ds-font-weight-bold);
}

.toast__message {
  color: var(--ds-color-text-secondary);
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(var(--ds-space-2));
  }
}
</style>
