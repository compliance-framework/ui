<template>
  <div class="space-y-1">
    <div
      ref="host"
      class="overflow-hidden rounded-md border border-ccf-300 dark:border-slate-700"
      :style="{ minHeight, maxHeight }"
      data-test="code-editor"
    />
    <p
      v-if="!readonly"
      class="text-[0.7rem] text-gray-400 dark:text-slate-500"
      aria-hidden="true"
    >
      Esc then Tab to leave the editor
    </p>
  </div>
</template>

<script setup lang="ts">
// CodeMirror 6 editor (LLD U2.8). Loaded asynchronously by consumers (see ./index.ts), so
// CodeMirror lives in its own chunk that is fetched only when an editor, diff or Rego view
// opens.
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
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
import { editorTheme, isDarkMode } from './theme';
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
const themeConf = new Compartment();
const labelConf = new Compartment();
let themeObserver: MutationObserver | null = null;

function readonlyExt(ro: boolean) {
  return [EditorState.readOnly.of(ro), EditorView.editable.of(!ro)];
}

function labelExt(label: string) {
  return EditorView.contentAttributes.of({ 'aria-label': label });
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
      themeConf.of(editorTheme(isDarkMode())),
      labelConf.of(labelExt(props.label)),
      EditorView.theme({
        '&': { maxHeight: props.maxHeight, minHeight: props.minHeight },
        '.cm-scroller': { overflow: 'auto' },
      }),
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

  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(() => {
      view.value?.dispatch({
        effects: themeConf.reconfigure(editorTheme(isDarkMode())),
      });
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }
});

onBeforeUnmount(() => {
  themeObserver?.disconnect();
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
      effects: readonlyConf.reconfigure(readonlyExt(ro)),
    });
  },
);

watch(
  () => props.label,
  (label) => {
    view.value?.dispatch({ effects: labelConf.reconfigure(labelExt(label)) });
  },
);

watch(() => props.diagnostics, applyDiagnostics, { deep: true });

defineExpose({ view });
</script>
