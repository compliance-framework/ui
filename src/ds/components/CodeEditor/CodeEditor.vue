<script setup lang="ts">
/**
 * A code editor (CodeMirror 6) with line numbers, search, undo, bracket matching and lint
 * markers, themed with the design tokens. `label` names the editable content. Escape stays
 * inside the editor (CodeMirror uses it), so a surrounding Dialog doesn't close on it; the hint
 * below says how to leave the editor by keyboard, and describes the content to screen readers.
 * Load it through `./index.ts`, so CodeMirror is its own chunk, fetched only when an editor opens.
 */
import { onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue';
import { Compartment, EditorState, Transaction } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { lintGutter, lintKeymap, setDiagnostics } from '@codemirror/lint';
import { languageExtension, type EditorLanguage } from './languages';
import { editorTheme, layoutTheme } from './theme';
import { toDiagnostics, type EditorDiagnostic } from './diagnostics';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    language: EditorLanguage;
    readonly?: boolean;
    diagnostics?: EditorDiagnostic[];
    minHeight?: string;
    maxHeight?: string;
    /** Accessible label of the editable content. */
    label: string;
  }>(),
  {
    readonly: false,
    diagnostics: () => [],
    minHeight: '120px',
    maxHeight: '480px',
  },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const host = ref<HTMLElement | null>(null);
const view = shallowRef<EditorView | null>(null);
const languageConf = new Compartment();
const readonlyConf = new Compartment();
const labelConf = new Compartment();
const hintId = `code-editor-hint-${useId()}`;

// Esc must stay inside the editor: CodeMirror uses it (tab-focus mode, closing search), but
// a document-level listener (e.g. a Dialog's Escape) would also act on it and close the
// dialog, discarding the text. CodeMirror still handles the key (return false).
const keepEscape = EditorView.domEventHandlers({
  keydown(event) {
    if (event.key === 'Escape') event.stopPropagation();
    return false;
  },
});

function readonlyExt(ro: boolean) {
  return [EditorState.readOnly.of(ro), EditorView.editable.of(!ro)];
}

// The "Esc then Tab" hint describes the editable content to screen readers.
function labelExt(label: string, ro: boolean) {
  return EditorView.contentAttributes.of(
    ro
      ? { 'aria-label': label }
      : { 'aria-label': label, 'aria-describedby': hintId },
  );
}

function applyDiagnostics() {
  const v = view.value;
  if (!v) return;
  v.dispatch(
    setDiagnostics(v.state, toDiagnostics(v.state.doc, props.diagnostics)),
  );
}

onMounted(() => {
  if (!host.value) return;
  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      drawSelection(),
      bracketMatching(),
      indentOnInput(),
      highlightSelectionMatches(),
      lintGutter(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        ...lintKeymap,
        indentWithTab,
      ]),
      languageConf.of(languageExtension(props.language)),
      readonlyConf.of(readonlyExt(props.readonly)),
      labelConf.of(labelExt(props.label, props.readonly)),
      editorTheme,
      layoutTheme,
      keepEscape,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const text = update.state.doc.toString();
          if (text !== props.modelValue) emit('update:modelValue', text);
        }
      }),
    ],
  });
  view.value = new EditorView({ state, parent: host.value });
  applyDiagnostics();
});

onBeforeUnmount(() => {
  view.value?.destroy();
  view.value = null;
});

// External model changes replace the document, only when they differ (no echo loops).
watch(
  () => props.modelValue,
  (value) => {
    const v = view.value;
    if (!v || value === v.state.doc.toString()) return;
    // Not undoable: undo must never bring back a different document (e.g. another module).
    v.dispatch({
      changes: { from: 0, to: v.state.doc.length, insert: value },
      annotations: Transaction.addToHistory.of(false),
    });
    applyDiagnostics();
  },
);

watch(
  () => props.language,
  (lang) => {
    view.value?.dispatch({
      effects: languageConf.reconfigure(languageExtension(lang)),
    });
  },
);

watch(
  () => props.readonly,
  (ro) => {
    view.value?.dispatch({
      effects: [
        readonlyConf.reconfigure(readonlyExt(ro)),
        labelConf.reconfigure(labelExt(props.label, ro)),
      ],
    });
  },
);

watch(
  () => props.label,
  (label) => {
    view.value?.dispatch({
      effects: labelConf.reconfigure(labelExt(label, props.readonly)),
    });
  },
);

watch(() => props.diagnostics, applyDiagnostics, { deep: true });

defineExpose({ view });
</script>

<template>
  <div class="code-editor">
    <div
      ref="host"
      class="code-editor__host"
      :style="{ minHeight, maxHeight }"
      data-test="code-editor"
    />
    <p v-if="!readonly" :id="hintId" class="code-editor__hint">
      Esc then Tab to leave the editor
    </p>
  </div>
</template>

<style scoped>
.code-editor {
  display: flex;
  flex-direction: column;
  gap: var(--ds-space-1);
  min-width: 0;
}

.code-editor__host {
  min-width: 0;
  overflow: hidden;
  border: var(--ds-border-width) solid var(--ds-color-border-strong);
  border-radius: var(--ds-radius-none);
}

.code-editor__hint {
  color: var(--ds-color-text-secondary);
  font-size: var(--ds-font-size-caption);
}
</style>
