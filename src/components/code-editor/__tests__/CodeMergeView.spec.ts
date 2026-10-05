import { afterEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import CodeMergeView from '../CodeMergeView.vue';

const editorClasses = (el: Element) =>
  [...el.querySelectorAll('.cm-editor')].map((e) => e.className);

describe('CodeMergeView', () => {
  afterEach(() => document.documentElement.classList.remove('dark'));

  it.each(['split', 'unified'] as const)(
    'follows dark-mode toggles without rebuilding (%s)',
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
      const light = editorClasses(wrapper.element);
      document.documentElement.classList.add('dark');
      await flushPromises();
      const dark = editorClasses(wrapper.element);
      expect(dark).not.toEqual(light);
      // The same editors, reconfigured in place.
      expect([...wrapper.element.querySelectorAll('.cm-editor')]).toEqual(
        editors,
      );
      document.documentElement.classList.remove('dark');
      await flushPromises();
      expect(editorClasses(wrapper.element)).toEqual(light);
      wrapper.unmount();
    },
  );
});
