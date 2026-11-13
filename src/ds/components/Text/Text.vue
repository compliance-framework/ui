<script setup lang="ts">
/**
 * Running text in one of the type roles, so screens never style text themselves (DEC-04).
 * `label` is the uppercase tracked style used for eyebrows and small headings; `prose` is for
 * long-form text such as statements, descriptions and remarks (D-23).
 */
withDefaults(
  defineProps<{
    variant?:
      'body' | 'secondary' | 'caption' | 'label' | 'metric' | 'code' | 'prose';
    as?: 'p' | 'span' | 'div' | 'strong' | 'code';
    preserveWhitespace?: boolean;
  }>(),
  { variant: 'body', as: 'p', preserveWhitespace: false },
);
</script>

<template>
  <component
    :is="as"
    class="text"
    :class="[
      `text--${variant}`,
      { 'text--preserve-whitespace': preserveWhitespace },
    ]"
    ><slot
  /></component>
</template>

<style scoped>
.text {
  margin: 0;
  overflow-wrap: anywhere;
}

.text--preserve-whitespace {
  white-space: pre-wrap;
}

.text--body {
  font-size: var(--font-size-body);
  line-height: var(--leading-body);
}

.text--secondary {
  color: var(--color-text-secondary);
  font-size: var(--font-size-body);
  line-height: var(--leading-body);
}

.text--caption {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
  line-height: var(--leading-snug);
}

.text--label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-label);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--tracking-wide);
  line-height: var(--leading-snug);
  text-transform: uppercase;
}

.text--metric {
  font-family: var(--font-display);
  font-size: var(--font-size-metric);
  font-weight: var(--font-weight-bold);
  line-height: var(--leading-tight);
}
.text--code {
  padding: 0 var(--space-1);
  border: var(--border-width) solid var(--color-border-subtle);
  background: var(--color-surface-sunken);
  font-family: var(--font-ui);
  font-size: var(--font-size-body);
  overflow-wrap: anywhere;
}
.text--prose {
  max-width: var(--width-reading);
  font-family: var(--font-prose);
  font-size: var(--font-size-prose);
  line-height: var(--leading-prose);
}
</style>
