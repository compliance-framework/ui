import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import V2RiskBadge from '../V2RiskBadge.vue';

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      {
        path: '/risks',
        name: 'risks:index',
        component: { template: '<div />' },
      },
    ],
  });
}

describe('V2RiskBadge', () => {
  it('links to the Risk Register filtered by the control', () => {
    const wrapper = mount(V2RiskBadge, {
      props: {
        summary: { count: 2, capped: false, severity: 'medium' },
        controlId: 'ac-2',
      },
      global: { plugins: [makeRouter()] },
    });
    const link = wrapper.get('a[data-testid="v2-risk-badge"]');

    expect(link.attributes('href')).toBe('/risks?controlId=ac-2');
    expect(link.text()).toBe('2 risks');
    expect(link.attributes('aria-label')).toBe(
      '2 open risks on ac-2. Open them in the Risk Register.',
    );
  });

  it('shows 99+ when the count hit the fetch cap', () => {
    const wrapper = mount(V2RiskBadge, {
      props: {
        summary: { count: 100, capped: true, severity: 'high' },
        controlId: 'ac-2',
        plain: true,
      },
      global: { plugins: [makeRouter()] },
    });

    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.get('span').text()).toBe('99+ risks');
  });

  it('renders nothing without open risks', () => {
    const wrapper = mount(V2RiskBadge, {
      props: { summary: null, controlId: 'ac-2' },
      global: { plugins: [makeRouter()] },
    });

    expect(wrapper.find('[data-testid="v2-risk-badge"]').exists()).toBe(false);
  });
});
