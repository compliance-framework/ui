import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import StatusBadge from '../components/StatusBadge/StatusBadge.vue';

describe('StatusBadge dot', () => {
  it('is a tone-coloured icon, named in text and by a tooltip', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'not-satisfied', dot: true },
      global: {
        stubs: {
          Tooltip: {
            props: ['text'],
            template: '<span :data-tip="text"><slot /></span>',
          },
        },
      },
    });
    const dot = wrapper.find('.status-dot');
    expect(dot.classes()).toContain('status-dot--error');
    expect(dot.find('svg').exists()).toBe(true);
    expect(dot.find('.visually-hidden').text()).toBe('Not satisfied');
    expect(wrapper.find('[data-tip]').attributes('data-tip')).toBe(
      'Not satisfied',
    );
    expect(wrapper.find('.status-badge').exists()).toBe(false);
  });
});
