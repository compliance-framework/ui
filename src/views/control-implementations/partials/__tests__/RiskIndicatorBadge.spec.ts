import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import RiskIndicatorBadge from '../RiskIndicatorBadge.vue';

describe('RiskIndicatorBadge', () => {
  it('renders nothing when there are no risks', () => {
    const wrapper = mount(RiskIndicatorBadge, {
      props: { riskCount: 0 },
    });
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.find('span').exists()).toBe(false);
  });

  it('caps the displayed count at 99+ when capped', () => {
    const wrapper = mount(RiskIndicatorBadge, {
      props: { riskCount: 250, isCapped: true },
    });
    expect(wrapper.text()).toContain('99+');
  });

  it('does not emit when not clickable', async () => {
    const wrapper = mount(RiskIndicatorBadge, {
      props: { riskCount: 3 },
    });
    await wrapper.find('span').trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  // Regression: emitting `click` without the native event made a parent
  // `@click.stop` handler call `.stopPropagation()` on `undefined` and throw.
  it('can be clicked through a parent @click.stop handler without throwing', async () => {
    let handled = false;
    const Parent = defineComponent({
      components: { RiskIndicatorBadge },
      setup() {
        return {
          onClick: () => {
            handled = true;
          },
        };
      },
      template: `<RiskIndicatorBadge :risk-count="3" clickable @click.stop="onClick" />`,
    });

    const wrapper = mount(Parent);
    await wrapper.find('button').trigger('click');
    expect(handled).toBe(true);
  });
});
