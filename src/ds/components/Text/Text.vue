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
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-leading-body);
}

.text--secondary {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-leading-body);
}

.text--caption {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
  line-height: var(--ds-leading-snug);
}

.text--label {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-label);
  font-weight: var(--ds-font-weight-bold);
  letter-spacing: var(--ds-tracking-wide);
  line-height: var(--ds-leading-snug);
  text-transform: uppercase;
}

.text--metric {
  font-family: var(--ds-font-display);
  font-size: var(--ds-font-size-metric);
  font-weight: var(--ds-font-weight-bold);
  line-height: var(--ds-leading-tight);
}
.text--code {
  padding: 0 var(--ds-space-1);
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
  background: var(--ds-color-surface-sunken);
  font-family: var(--ds-font-code);
  font-size: var(--ds-font-size-body);
  overflow-wrap: anywhere;
}
.text--prose {
  max-width: var(--ds-width-reading);
  font-family: var(--ds-font-prose);
  font-size: var(--ds-font-size-prose);
  line-height: var(--ds-leading-prose);
}
</style>
