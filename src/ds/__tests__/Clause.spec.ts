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
    expect(wrapper.find('.clause__actions').exists()).toBe(false);
  });

  it('puts its actions right after its text', () => {
    const wrapper = mount(Clause, {
      slots: { default: 'Text', actions: '<button>More</button>' },
    });
    expect(wrapper.find('.clause__line > .clause__actions').text()).toBe(
      'More',
    );
  });

  it('is its annotation alone when it has no text', () => {
    const wrapper = mount(Clause, {
      slots: { annotation: 'Okta: implemented' },
    });
    expect(wrapper.find('.clause__line').exists()).toBe(false);
    expect(wrapper.find('.clause__annotation').text()).toBe(
      'Okta: implemented',
    );
  });
});
