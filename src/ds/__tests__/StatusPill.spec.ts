import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import StatusPill from '../components/StatusPill/StatusPill.vue';

describe('StatusPill', () => {
  it("names the status on its tone's colour", () => {
    const wrapper = mount(StatusPill, { props: { status: 'partial' } });
    expect(wrapper.text()).toBe('Partial');
    expect(wrapper.classes()).toContain('pill--warning');
  });

  it('takes a tone that overrides the vocabulary', () => {
    const wrapper = mount(StatusPill, {
      props: { status: 'not-applicable', tone: 'info' },
    });
    expect(wrapper.text()).toBe('Not applicable');
    expect(wrapper.classes()).toContain('pill--info');
  });
});
