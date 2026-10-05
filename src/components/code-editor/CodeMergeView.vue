<template>
  <div
    ref="host"
    class="overflow-auto rounded-md border border-ccf-300 dark:border-slate-700"
    :style="{ maxHeight }"
    data-test="code-merge-view"
  />
</template>

<script setup lang="ts">
// Read-only diff (LLD U2.8): split (MergeView) or unified (unifiedMergeView).
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { MergeView, unifiedMergeView } from '@codemirror/merge';
import { languageExtension, type EditorLanguage } from './languages';
import { editorTheme, isDarkMode, onDarkModeChange } from './theme';

const props = withDefaults(
  defineProps<{
    original: string;
    modified: string;
    language: EditorLanguage;
    mode?: 'split' | 'unified';
    maxHeight?: string;
  }>(),
  { mode: 'split', maxHeight: '70vh' },
);

const host = ref<HTMLElement | null>(null);
let destroy: (() => void) | null = null;
let views: EditorView[] = [];
let stopThemeSync: (() => void) | null = null;
// Follows dark-mode toggles like CodeEditor, without rebuilding the diff.
const themeConf = new Compartment();

function extensions() {
  return [
    lineNumbers(),
    EditorState.readOnly.of(true),
    EditorView.editable.of(false),
    languageExtension(props.language, false),
    themeConf.of(editorTheme(isDarkMode())),
  ];
}

function build() {
  destroy?.();
  destroy = null;
  views = [];
  if (!host.value) return;
  if (props.mode === 'split') {
    const mv = new MergeView({
      a: { doc: props.original, extensions: extensions() },
      b: { doc: props.modified, extensions: extensions() },
      parent: host.value,
      collapseUnchanged: { margin: 3, minSize: 6 },
    });
    views = [mv.a, mv.b];
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
    views = [v];
    destroy = () => v.destroy();
  }
}

onMounted(() => {
  build();
  stopThemeSync = onDarkModeChange((dark) => {
    for (const v of views)
      v.dispatch({ effects: themeConf.reconfigure(editorTheme(dark)) });
  });
});
onBeforeUnmount(() => {
  stopThemeSync?.();
  destroy?.();
});
watch(
  () => [props.original, props.modified, props.language, props.mode],
  build,
);
</script>
