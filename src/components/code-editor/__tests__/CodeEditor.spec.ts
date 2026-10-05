import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
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

  it('keeps Escape inside the editor so a dialog does not close on it', () => {
    const wrapper = mountEditor();
    const onDocument = vi.fn();
    document.addEventListener('keydown', onDocument);
    try {
      const content = wrapper.find('.cm-content').element;
      content.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      expect(onDocument).not.toHaveBeenCalled();
      // Other keys still bubble.
      content.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
      );
      expect(onDocument).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener('keydown', onDocument);
      wrapper.unmount();
    }
  });

  it('describes the editable content with the "Esc then Tab" hint', async () => {
    const wrapper = mountEditor();
    const hint = wrapper.find('p');
    expect(hint.attributes('aria-hidden')).toBeUndefined();
    const id = hint.attributes('id');
    expect(id).toBeTruthy();
    expect(wrapper.find('.cm-content').attributes('aria-describedby')).toBe(id);
    // Unique per editor in the app.
    const both = mount(
      defineComponent({
        components: { CodeEditor },
        template: `<div>
          <CodeEditor model-value="" language="yaml" label="A" />
          <CodeEditor model-value="" language="yaml" label="B" />
        </div>`,
      }),
      { attachTo: document.body },
    );
    const ids = both.findAll('p').map((p) => p.attributes('id'));
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    both.unmount();
    await wrapper.setProps({ readonly: true });
    expect(
      wrapper.find('.cm-content').attributes('aria-describedby'),
    ).toBeUndefined();
    wrapper.unmount();
  });

  it('takes min/max height from the host, following prop changes', async () => {
    const wrapper = mountEditor({ minHeight: '100px', maxHeight: '300px' });
    const host = wrapper.find('[data-test="code-editor"]')
      .element as HTMLElement;
    expect(host.style.maxHeight).toBe('300px');
    await wrapper.setProps({ maxHeight: '200px' });
    expect(host.style.maxHeight).toBe('200px');
    expect(host.style.minHeight).toBe('100px');
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
