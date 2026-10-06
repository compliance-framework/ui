import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import KeyValueEditor, { type KeyValueRow } from '../editor/KeyValueEditor.vue';
import { ADMIN, globalWith, piniaWith } from './helpers';

const rows: KeyValueRow[] = [{ key: 'foo', value: '1', provenance: 'file' }];

function mountEditor() {
  return mount(KeyValueEditor, {
    props: { rows, label: 'Label' },
    global: globalWith(piniaWith(ADMIN)),
  });
}

describe('KeyValueEditor: new keys', () => {
  it('trims the key: "foo " duplicates "foo"', async () => {
    const w = mountEditor();
    await w.find('[data-test="kv-new-key"]').setValue('foo ');
    expect(w.text()).toContain('Duplicate key');
    expect(w.find('[data-test="kv-add"]').attributes('disabled')).toBeDefined();
  });

  it('emits the trimmed key', async () => {
    const w = mountEditor();
    await w.find('[data-test="kv-new-key"]').setValue('  bar ');
    await w.find('[data-test="kv-new-value"]').setValue('2');
    await w.find('form').trigger('submit');
    expect(w.emitted('add')).toEqual([['bar', '2']]);
  });

  it('rejects a blank key', async () => {
    const w = mountEditor();
    await w.find('[data-test="kv-new-key"]').setValue('   ');
    expect(w.text()).toContain('The key is empty');
    await w.find('form').trigger('submit');
    expect(w.emitted('add')).toBeUndefined();
  });
});
