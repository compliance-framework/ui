import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import Combobox from '../components/Combobox/Combobox.vue';

const options = [
  { value: 'a', label: 'payments-db' },
  { value: 'b', label: 'ledger-api' },
];

// jsdom has no scrollIntoView, which the list calls on its highlighted option.
beforeAll(() => {
  Element.prototype.scrollIntoView ??= () => {};
});

const mounted: { unmount(): void }[] = [];
afterEach(() => mounted.splice(0).forEach((w) => w.unmount()));

async function typeInto(remote: boolean, text: string) {
  const wrapper = mount(Combobox, {
    props: { options, label: 'Subject', remote },
    attachTo: document.body,
  });
  mounted.push(wrapper);
  const input = wrapper.find('input');
  await input.trigger('click');
  await input.setValue(text);
  await flushPromises();
  const shown = [...document.querySelectorAll('[role="option"]')].map((o) =>
    o.textContent?.trim(),
  );
  return { wrapper, shown };
}

describe('Combobox', () => {
  it('filters its own options as you type', async () => {
    const { wrapper, shown } = await typeInto(false, 'ledger');
    expect(shown).toEqual(['ledger-api']);
    expect(wrapper.emitted('search')).toBeUndefined();
  });

  it('leaves a remote search to the caller and shows its results unfiltered', async () => {
    const { wrapper, shown } = await typeInto(true, 'ledger');
    expect(wrapper.emitted('search')).toEqual([[''], ['ledger']]);
    expect(shown).toEqual(['payments-db', 'ledger-api']);
  });

  it('offers a clear button once something is chosen, when clearable', async () => {
    const wrapper = mount(Combobox, {
      props: { options, label: 'Subject', clearable: true, modelValue: '' },
    });
    mounted.push(wrapper);
    expect(wrapper.find('button[aria-label="Clear Subject"]').exists()).toBe(
      false,
    );
    await wrapper.setProps({ modelValue: 'a' });
    await wrapper.find('button[aria-label="Clear Subject"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([['']]);
  });
});
