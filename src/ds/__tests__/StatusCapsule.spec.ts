import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import StatusCapsule from '../components/StatusCapsule/StatusCapsule.vue';

describe('StatusCapsule', () => {
  it('shows every count in order, zeros too, named in text and by a tooltip', () => {
    const wrapper = mount(StatusCapsule, {
      props: {
        segments: [
          { status: 'satisfied', count: 3 },
          { status: 'unknown', count: 0 },
          { status: 'not-satisfied', count: 1 },
        ],
      },
      global: {
        stubs: {
          Tooltip: {
            props: ['text'],
            template: '<span :data-tip="text"><slot /></span>',
          },
        },
      },
    });
    const segments = wrapper.findAll('.status-capsule__segment');
    expect(segments.map((s) => s.text())).toEqual(['3', '0', '1']);
    expect(segments.map((s) => s.classes().at(-1))).toEqual([
      'status-capsule__segment--success',
      'status-capsule__segment--neutral',
      'status-capsule__segment--error',
    ]);
    const words = '3 satisfied, 0 unknown, 1 not satisfied';
    expect(wrapper.find('.visually-hidden').text()).toBe(words);
    expect(wrapper.find('[data-tip]').attributes('data-tip')).toBe(words);
  });
});
