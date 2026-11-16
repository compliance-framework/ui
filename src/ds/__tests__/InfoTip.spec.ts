import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import InfoTip from '../components/InfoTip/InfoTip.vue';

function mountTip(props: InstanceType<typeof InfoTip>['$props']) {
  return mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(InfoTip, { ...props, 'data-test': 'tip' }),
        ),
    }),
    { attachTo: document.body },
  );
}

describe('InfoTip', () => {
  it('is a focusable button named by its text, carrying passed attributes', () => {
    const wrapper = mountTip({ text: 'Set on the agent host', icon: 'locked' });
    const button = wrapper.find('button');
    expect(button.attributes('type')).toBe('button');
    expect(button.attributes('aria-label')).toBe('Set on the agent host');
    expect(button.attributes('data-test')).toBe('tip');
    expect(button.classes()).toContain('info-tip--neutral');
    wrapper.unmount();
  });

  it('opens its note on click (touch)', async () => {
    const wrapper = mountTip({
      text: 'Only some hosts apply this',
      tone: 'warning',
    });
    const button = wrapper.find('button');
    expect(button.classes()).toContain('info-tip--warning');
    await button.trigger('click');
    expect(document.body.textContent).toContain('Only some hosts apply this');
    expect(button.attributes('data-state')).toMatch(/open/);
    wrapper.unmount();
  });
});
