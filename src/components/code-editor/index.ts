// Async entry points: CodeMirror is split into its own chunk and loaded only when an editor or
// a diff is actually rendered (the read-only Configuration tab never loads it).
import { defineAsyncComponent } from 'vue';
import CodeEditorError from './CodeEditorError.vue';
import CodeEditorFallback from './CodeEditorFallback.vue';

/** Retries of a failed chunk load before the error component is shown. */
export const MAX_LOAD_RETRIES = 2;

export function retryLoad(
  _error: Error,
  retry: () => void,
  fail: () => void,
  attempts: number,
): void {
  if (attempts <= MAX_LOAD_RETRIES) retry();
  else fail();
}

export const CodeEditor = defineAsyncComponent({
  loader: () => import('./CodeEditor.vue'),
  loadingComponent: CodeEditorFallback,
  errorComponent: CodeEditorError,
  onError: retryLoad,
});

export const CodeMergeView = defineAsyncComponent({
  loader: () => import('./CodeMergeView.vue'),
  loadingComponent: CodeEditorFallback,
  errorComponent: CodeEditorError,
  onError: retryLoad,
});

export type { EditorDiagnostic } from './diagnostics';
export type { EditorLanguage } from './languages';
