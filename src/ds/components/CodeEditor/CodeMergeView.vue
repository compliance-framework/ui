<script setup lang="ts">
/**
 * A read-only diff of two texts: side by side (`split`) or inline (`unified`), with unchanged
 * runs collapsed. Themed with the design tokens, so it follows the colour scheme without being
 * rebuilt. `label` names the diff region. Load it through `./index.ts` (its own chunk).
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { MergeView, unifiedMergeView } from '@codemirror/merge';
import { languageExtension, type EditorLanguage } from './languages';
import { editorTheme } from './theme';

const props = withDefaults(
  defineProps<{
    original: string;
    modified: string;
    language: EditorLanguage;
    mode?: 'split' | 'unified';
    maxHeight?: string;
    label?: string;
  }>(),
  { mode: 'split', maxHeight: '70vh', label: 'Differences' },
);

const host = ref<HTMLElement | null>(null);
let destroy: (() => void) | null = null;

function extensions() {
  return [
    lineNumbers(),
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
    languageExtension(props.language, false),
    editorTheme,
  ];
}

function build() {
  destroy?.();
  destroy = null;
  if (!host.value) return;
  if (props.mode === 'split') {
    const mv = new MergeView({
      a: { doc: props.original, extensions: extensions() },
      b: { doc: props.modified, extensions: extensions() },
      parent: host.value,
      collapseUnchanged: { margin: 3, minSize: 6 },
    });
    destroy = () => mv.destroy();
  } else {
    const v = new EditorView({
      parent: host.value,
      state: EditorState.create({
        doc: props.modified,
        extensions: [
          ...extensions(),
          unifiedMergeView({
            original: props.original,
            mergeControls: false,
            collapseUnchanged: { margin: 3, minSize: 6 },
          }),
        ],
      }),
    });
    destroy = () => v.destroy();
  }
}

onMounted(build);
onBeforeUnmount(() => destroy?.());
watch(
  () => [props.original, props.modified, props.language, props.mode],
  build,
);
</script>

<template>
  <div
    ref="host"
    class="code-merge-view"
    role="region"
    :aria-label="label"
    :style="{ maxHeight }"
    data-test="code-merge-view"
  />
</template>

<style scoped>
.code-merge-view {
  min-width: 0;
  overflow: auto;
  border: var(--ds-border-width) solid var(--ds-color-border-subtle);
  border-radius: var(--ds-radius-none);
}

/* CodeMirror's change tints are translucent, so they read on either scheme; its collapsed-run
   bar is not, so it takes the tokens. */
.code-merge-view :deep(.cm-collapsedLines) {
  background: var(--ds-color-surface-sunken);
  color: var(--ds-color-text-secondary);
}
</style>
