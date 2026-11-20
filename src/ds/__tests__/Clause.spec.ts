import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import Clause from '../components/Clause/Clause.vue';

const Tooltip = {
  props: ['text'],
  template: '<span :data-tip="text"><slot /></span>',
};

describe('Clause', () => {
  it('hangs its label, indents by depth and sets its annotation apart', () => {
    const wrapper = mount(Clause, {
      props: { label: '(a)', hint: 'ac-1_smt.a.1.a', depth: 2 },
      slots: { default: 'Addresses purpose;', annotation: 'Okta: implemented' },
      global: { stubs: { Tooltip } },
    });
    expect(wrapper.classes()).toContain('clause--depth-2');
    expect(wrapper.find('.clause__label').text()).toBe('(a)');
    expect(wrapper.find('[data-tip]').attributes('data-tip')).toBe(
      'ac-1_smt.a.1.a',
    );
    expect(wrapper.find('.clause__text').text()).toBe('Addresses purpose;');
    expect(wrapper.find('.clause__annotation').text()).toBe(
      'Okta: implemented',
    );
  });

  it('caps the indent at three steps and leaves out an empty annotation', () => {
    const wrapper = mount(Clause, {
      props: { depth: 5 },
      slots: { default: 'Text' },
    });
    expect(wrapper.classes()).toContain('clause--depth-3');
    expect(wrapper.find('.clause__annotation').exists()).toBe(false);
  });
});
