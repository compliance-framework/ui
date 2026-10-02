import { describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import CodeEditor from '../CodeEditor.vue';

function mountEditor(props: Record<string, unknown> = {}) {
  return mount(CodeEditor, {
    props: {
      modelValue: 'a: 1\n',
      language: 'yaml',
      label: 'Overlay YAML',
      ...props,
    },
    attachTo: document.body,
  });
}

describe('CodeEditor (CodeMirror 6)', () => {
  it('renders the model value and emits edits (v-model both ways)', async () => {
    const wrapper = mountEditor();
    const view = (
      wrapper.vm as unknown as {
        view: {
          state: { doc: { toString(): string } };
          dispatch: (t: unknown) => void;
        };
      }
    ).view;
    expect(view.state.doc.toString()).toBe('a: 1\n');
    expect(wrapper.find('.cm-content').attributes('aria-label')).toBe(
      'Overlay YAML',
    );

    view.dispatch({ changes: { from: 0, insert: 'b: 2\n' } });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['b: 2\na: 1\n']);

    await wrapper.setProps({ modelValue: 'c: 3\n' });
    expect(view.state.doc.toString()).toBe('c: 3\n');
    // External changes do not echo back.
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
    wrapper.unmount();
  });

  it('is read-only when asked', async () => {
    const wrapper = mountEditor({ readonly: true });
    expect(wrapper.find('.cm-content').attributes('contenteditable')).toBe(
      'false',
    );
    expect(wrapper.text()).not.toContain('Esc then Tab');
    await wrapper.setProps({ readonly: false });
    expect(wrapper.find('.cm-content').attributes('contenteditable')).toBe(
      'true',
    );
    expect(wrapper.text()).toContain('Esc then Tab to leave the editor');
    wrapper.unmount();
  });

  it('renders diagnostics', async () => {
    const wrapper = mountEditor({
      modelValue: 'plugins:\n  ssh:\n    source: [\n',
      language: 'yaml',
      diagnostics: [
        { row: 3, col: 13, message: 'unexpected end', severity: 'error' },
      ],
    });
    await flushPromises();
    expect(wrapper.find('.cm-lintRange').exists()).toBe(true);
    expect(wrapper.find('.cm-lintRange-error').exists()).toBe(true);
    await wrapper.setProps({ diagnostics: [] });
    expect(wrapper.find('.cm-lintRange').exists()).toBe(false);
    wrapper.unmount();
  });
  it('does not put external document replacements in the undo history', async () => {
    const { undo } = await import('@codemirror/commands');
    const wrapper = mountEditor({ modelValue: 'module A\n' });
    const view = (wrapper.vm as unknown as { view: Parameters<typeof undo>[0] })
      .view;
    await wrapper.setProps({ modelValue: 'module B\n' });
    expect(undo(view)).toBe(false);
    expect(view.state.doc.toString()).toBe('module B\n');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    wrapper.unmount();
  });
});
