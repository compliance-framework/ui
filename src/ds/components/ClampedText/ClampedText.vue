<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

/**
 * Long text cut to three lines to save room, e.g. a control statement in a row, with "Show more"
 * to read the rest in place. The button appears only when the text is cut. All of it is in the
 * page throughout, so screen readers and find-in-page reach it. Line breaks in the text are kept.
 */
const props = defineProps<{ text: string }>();

const body = useTemplateRef<HTMLElement>('body');
const expanded = ref(false);
const cut = ref(false);
let observer: ResizeObserver | undefined;

function measure(): void {
  const el = body.value;
  if (!el || expanded.value) return;
  cut.value = el.scrollHeight > el.clientHeight + 1;
}

onMounted(() => {
  measure();
  if (typeof ResizeObserver === 'undefined' || !body.value) return;
  observer = new ResizeObserver(measure);
  observer.observe(body.value);
});
onBeforeUnmount(() => observer?.disconnect());
watch(
  () => props.text,
  () => {
    expanded.value = false;
    requestAnimationFrame(measure);
  },
);
</script>

<template>
  <div class="clamped-text">
    <p
      ref="body"
      class="clamped-text__body"
      :class="{ 'clamped-text__body--cut': !expanded }"
    >
      {{ text }}
    </p>
    <button
      v-if="cut || expanded"
      type="button"
      class="clamped-text__toggle"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'Show less' : 'Show more' }}
    </button>
  </div>
</template>

<style scoped>
.clamped-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--ds-space-1);
  min-width: 0;
}

.clamped-text__body {
  margin: 0;
  font-size: var(--ds-font-size-body);
  line-height: var(--ds-leading-body);
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.clamped-text__body--cut {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.clamped-text__toggle {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ds-color-text-primary);
  font: inherit;
  font-size: var(--ds-font-size-caption);
  font-weight: var(--ds-font-weight-semibold);
  text-decoration: underline;
  text-decoration-thickness: var(--ds-border-width);
  text-underline-offset: var(--ds-space-1);
  cursor: pointer;
}

/* As TextLink. */
.clamped-text__toggle:hover {
  color: var(--ds-color-text-accent);
  text-decoration-thickness: var(--ds-focus-width);
}
</style>
