import { afterEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import CodeMergeView from '../components/CodeEditor/CodeMergeView.vue';

describe('CodeMergeView', () => {
  afterEach(() => document.documentElement.classList.remove('dark'));

  it.each([
    ['split', 2],
    ['unified', 1],
  ] as const)('renders a labelled read-only diff (%s)', (mode, editors) => {
    const wrapper = mount(CodeMergeView, {
      props: {
        original: 'a: 1\n',
        modified: 'a: 2\n',
        language: 'yaml',
        mode,
        label: 'Overlay changes',
      },
      attachTo: document.body,
    });
    const region = wrapper.find('[data-test="code-merge-view"]');
    expect(region.attributes('role')).toBe('region');
    expect(region.attributes('aria-label')).toBe('Overlay changes');
    expect(wrapper.findAll('.cm-editor')).toHaveLength(editors);
    for (const content of wrapper.findAll('.cm-content'))
      expect(content.attributes('contenteditable')).toBe('false');
    wrapper.unmount();
  });

  it.each(['split', 'unified'] as const)(
    'themes with design tokens, so dark mode keeps the same editors (%s)',
    async (mode) => {
      const wrapper = mount(CodeMergeView, {
        props: {
          original: 'a: 1\n',
          modified: 'a: 2\n',
          language: 'yaml',
          mode,
        },
        attachTo: document.body,
      });
      const editors = [...wrapper.element.querySelectorAll('.cm-editor')];
      const classes = editors.map((e) => e.className);
      document.documentElement.classList.add('dark');
      await flushPromises();
      expect([...wrapper.element.querySelectorAll('.cm-editor')]).toEqual(
        editors,
      );
      expect(editors.map((e) => e.className)).toEqual(classes);
      // CodeMirror mounts its theme as a style sheet: colours come from tokens, never literals.
      const css = [...document.querySelectorAll('style')]
        .map((s) => s.textContent ?? '')
        .join('\n');
      expect(css).toContain('var(--ds-color-surface-raised)');
      wrapper.unmount();
    },
  );
});
