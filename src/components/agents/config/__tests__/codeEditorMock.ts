// Synchronous stand-ins for the async CodeMirror components (@/components/code-editor).
// Usage in a spec: vi.mock('@/components/code-editor', () => import('./codeEditorMock'));
import { defineComponent, h } from 'vue';

export const CodeEditor = defineComponent({
  name: 'CodeEditor',
  props: ['modelValue', 'readonly', 'language', 'diagnostics', 'label'],
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('textarea', {
        class: 'code-editor-stub',
        'data-language': props.language,
        'data-diagnostics': JSON.stringify(props.diagnostics ?? []),
        readonly: props.readonly,
        value: props.modelValue,
        onInput: (e: Event) =>
          emit('update:modelValue', (e.target as HTMLTextAreaElement).value),
      });
  },
});

export const CodeMergeView = defineComponent({
  name: 'CodeMergeView',
  props: ['original', 'modified', 'language', 'mode'],
  setup(props) {
    return () =>
      h('div', { class: 'merge-stub' }, `${props.original}|${props.modified}`);
  },
});
