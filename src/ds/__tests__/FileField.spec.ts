import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import FileField from '../components/FileField/FileField.vue';

function choose(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new Event('change'));
}

describe('FileField', () => {
  it('takes one file by default, shown by name and size', async () => {
    const wrapper = mount(FileField, {
      props: { accept: '.json', label: 'File' },
    });
    choose(wrapper.find('input').element, [
      new File(['{}'], 'a.json'),
      new File(['{}'], 'b.json'),
    ]);
    expect((wrapper.emitted('update:modelValue')![0] as [File])[0].name).toBe(
      'a.json',
    );
    expect(wrapper.emitted('update:files')).toBeUndefined();
  });

  it('with multiple, takes every chosen file, lists them and clears them', async () => {
    const wrapper = mount(FileField, {
      props: {
        accept: '.json',
        label: 'Files',
        multiple: true,
        'onUpdate:files': (files: File[]) => wrapper.setProps({ files }),
      },
    });
    const input = wrapper.find('input');
    expect(input.attributes('multiple')).toBeDefined();
    choose(input.element, [
      new File(['{}'], 'a.json'),
      new File(['{"x":1}'], 'b.json'),
    ]);
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('li').map((li) => li.text())).toEqual([
      'a.json · 2 bytes',
      'b.json · 7 bytes',
    ]);
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('update:files')!.at(-1)).toEqual([[]]);
  });
});
