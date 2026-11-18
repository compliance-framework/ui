import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import { mount } from '@vue/test-utils';
import DataTable from '../components/DataTable/DataTable.vue';

describe('DataTable header slots', () => {
  it("replaces a column's title with its header-<key> slot", () => {
    const wrapper = mount(DataTable, {
      props: {
        caption: 'Evidence',
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'labels', label: 'Labels' },
        ],
        rows: [{ id: '1', name: 'A', labels: 'x' }],
        rowKey: (row: unknown) => (row as { id: string }).id,
      },
      slots: {
        'header-labels': ({ label }: { label: string }) => [
          label,
          h('button', 'Toggle'),
        ],
      },
    });
    const [name, labels] = wrapper.findAll('thead th');
    expect(name!.text()).toBe('Name');
    expect(labels!.text()).toBe('LabelsToggle');
    expect(labels!.find('button').exists()).toBe(true);
  });
});
