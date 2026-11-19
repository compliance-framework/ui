import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import Outline from '../components/Outline/Outline.vue';

const items = [
  {
    id: 'ac-1_smt.a',
    label: 'a.',
    text: 'Develop:',
    hint: 'ac-1_smt.a',
    items: [{ id: 'ac-1_smt.a.1', label: '1.', text: 'A policy.' }],
  },
  { id: 'ac-1_smt.b', label: 'b.', text: 'Designate.' },
];

describe('Outline', () => {
  it('lists each item with its own label, and nests items under their parent', () => {
    const wrapper = mount(Outline, {
      props: { items },
      global: { stubs: { Tooltip: { template: '<slot />' } } },
    });
    const top = [...wrapper.element.children];
    expect(top.map((li) => li.querySelector('span')?.textContent)).toEqual([
      'a.',
      'b.',
    ]);
    expect(top[0]!.querySelector('ol li')?.textContent).toContain('1.');
    expect(top[0]!.querySelector('ol li')?.textContent).toContain('A policy.');
  });

  it('makes a label with a hint focusable, and only that one', () => {
    const wrapper = mount(Outline, {
      props: { items },
      global: { stubs: { Tooltip: { template: '<slot />' } } },
    });
    expect(wrapper.findAll('[tabindex="0"]').map((l) => l.text())).toEqual([
      'a.',
    ]);
  });
});
