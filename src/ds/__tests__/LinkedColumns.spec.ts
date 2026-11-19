import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import LinkedColumns from '../components/LinkedColumns/LinkedColumns.vue';
import LinkedColumnsHeader from '../components/LinkedColumns/LinkedColumnsHeader.vue';

const columns = [
  { key: 'control', label: 'Control' },
  { key: 'implementation', label: 'Implementation' },
  { key: 'evidence', label: 'Evidence' },
];

describe('LinkedColumns', () => {
  it('fills a labelled box per column, in order, with an arrow between each', () => {
    const wrapper = mount(LinkedColumns, {
      props: { columns },
      slots: {
        control: '<p>AC-2</p>',
        implementation: '<p>Okta</p>',
        evidence: '<p>MFA filter</p>',
      },
    });
    const boxes = wrapper.findAll('section');
    expect(boxes.map((b) => b.attributes('aria-label'))).toEqual([
      'Control',
      'Implementation',
      'Evidence',
    ]);
    expect(boxes.map((b) => b.find('p').text())).toEqual([
      'AC-2',
      'Okta',
      'MFA filter',
    ]);
    expect(wrapper.findAll('.linked-columns__arrow')).toHaveLength(2);
    expect(
      wrapper.find('.linked-columns__arrow').attributes('aria-hidden'),
    ).toBe('true');
  });

  it('labels the columns once, hidden from assistive technology', () => {
    const wrapper = mount(LinkedColumnsHeader, { props: { columns } });
    expect(wrapper.attributes('aria-hidden')).toBe('true');
    expect(
      wrapper.findAll('.linked-columns-header__label').map((l) => l.text()),
    ).toEqual(['Control', 'Implementation', 'Evidence']);
  });
});
