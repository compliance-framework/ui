import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import V2StatusChip from '@/components/v2/primitives/V2StatusChip.vue';

describe('V2StatusChip', () => {
  it('renders mapped label for known status', () => {
    const wrapper = mount(V2StatusChip, {
      props: {
        status: 'active',
      },
    });

    expect(wrapper.text()).toContain('Active');
  });

  it('uses provided label override', () => {
    const wrapper = mount(V2StatusChip, {
      props: {
        status: 'failed',
        label: 'Blocked',
      },
    });

    expect(wrapper.text()).toContain('Blocked');
    expect(wrapper.text()).not.toContain('Failed');
  });
});
