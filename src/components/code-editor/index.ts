// Async entry points: CodeMirror is split into its own chunk and loaded only when an editor,
// a diff or a Rego view is actually rendered (the read-only Configuration tab never loads it).
import { defineAsyncComponent } from 'vue';
import CodeEditorFallback from './CodeEditorFallback.vue';

export const CodeEditor = defineAsyncComponent({
  loader: () => import('./CodeEditor.vue'),
  loadingComponent: CodeEditorFallback,
});

export const CodeMergeView = defineAsyncComponent({
  loader: () => import('./CodeMergeView.vue'),
  loadingComponent: CodeEditorFallback,
});

export type { EditorDiagnostic } from './diagnostics';
export type { EditorLanguage } from './languages';
