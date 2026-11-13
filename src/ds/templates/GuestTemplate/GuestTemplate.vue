<script setup lang="ts">
import { TooltipProvider } from 'reka-ui';
import Stack from '../../components/layout/Stack.vue';
import Text from '../../components/Text/Text.vue';

/**
 * Pages for people who aren't signed in (sign-in, password reset, SSO and Slack callbacks): the
 * CCF mark above one centred panel with the page's only h1. The default slot is the panel's
 * content; `footer` sits under the panel, e.g. "Back to sign in".
 */
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <!-- Guest pages render outside AppShell, so they provide tooltips themselves. -->
  <TooltipProvider>
    <main id="main" class="guest">
      <div class="guest__column">
        <p class="guest__brand">
          <span class="guest__mark" aria-hidden="true" />
          <span class="guest__wordmark">CCF</span>
          <span class="guest__name">Continuous Compliance Framework</span>
        </p>
        <section class="guest__panel" aria-labelledby="guest-title">
          <Stack gap="5">
            <Stack gap="2">
              <h1 id="guest-title" class="guest__title">{{ title }}</h1>
              <Text v-if="description" variant="caption">{{
                description
              }}</Text>
            </Stack>
            <slot />
          </Stack>
        </section>
        <div v-if="$slots.footer" class="guest__footer">
          <slot name="footer" />
        </div>
      </div>
    </main>
  </TooltipProvider>
</template>

<style scoped>
.guest {
  display: flex;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: var(--ds-space-8) var(--ds-space-page-x);
  background: var(--ds-color-surface-base);
  color: var(--ds-color-text-primary);
}

.guest__column {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-5);
  width: 100%;
  max-width: var(--ds-width-dialog-s);
}

.guest__brand {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ds-space-2);
  margin: 0;
}

.guest__mark {
  width: var(--ds-size-icon-sm);
  height: var(--ds-size-icon-sm);
  background: var(--ds-color-action-primary-bg);
  border: var(--ds-border-width) solid var(--ds-color-action-primary-border);
}

.guest__wordmark {
  font-size: var(--ds-font-size-body);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-logo);
}

.guest__name {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
}

.guest__panel {
  padding: var(--ds-space-6);
  background: var(--ds-color-surface-raised);
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
}

.guest__title {
  margin: 0;
  font-size: var(--ds-font-size-h2);
  line-height: var(--ds-leading-tight);
}

.guest__footer {
  text-align: center;
}
</style>
