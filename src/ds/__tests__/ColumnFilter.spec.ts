import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ColumnFilter from '../components/DataTable/ColumnFilter.vue';

beforeAll(() => {
  // jsdom has no scrollIntoView, which the list calls on its highlighted option.
  Element.prototype.scrollIntoView ??= () => {};
});

const options = [{ value: 'a', label: 'payments-db (system component)' }];
const mounted: { unmount(): void }[] = [];
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

function mountFilter(modelValue = '') {
  const wrapper = mount(ColumnFilter, {
    props: {
      label: 'Subjects',
      name: 'subject',
      options,
      valueLabel: modelValue ? 'payments-db' : undefined,
      modelValue,
    },
    attachTo: document.body,
    global: { stubs: { Tooltip: { template: '<slot />' } } },
  });
  mounted.push(wrapper);
  return wrapper;
}

describe('ColumnFilter', () => {
  it('is the column title until clicked, then a focused search field', async () => {
    const wrapper = mountFilter();
    const title = wrapper.find('button');
    expect(title.text()).toBe('Subjects , filter by subject');
    await title.trigger('click');
    await flushPromises();
    const input = wrapper.find('input');
    expect(input.attributes('aria-label')).toBe('Filter by subject');
    expect(document.activeElement).toBe(input.element);
  });

  it('shows the choice in the header, with a clear button', async () => {
    const wrapper = mountFilter('a');
    expect(wrapper.find('.column-filter__text').text()).toBe(
      'subject = payments-db',
    );
    await wrapper
      .find('button[aria-label="Clear subject filter"]')
      .trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([['']]);
  });
});
