import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import MetricTile from '../components/MetricTile/MetricTile.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:any(.*)*', component: { template: '<div />' } }],
});

describe('MetricTile', () => {
  it('is one link when it has a destination', () => {
    const wrapper = mount(MetricTile, {
      props: { label: 'Open risks', value: '4', to: '/risks' },
      global: { plugins: [router] },
    });
    const link = wrapper.get('a');
    expect(link.attributes('href')).toBe('/risks');
    expect(link.text()).toContain('Open risks');
    expect(link.text()).toContain('4');
  });

  it('is a plain figure without a destination', () => {
    const wrapper = mount(MetricTile, {
      props: { label: 'Worker mode', value: 'Notify', description: 'Enabled' },
      global: { plugins: [router] },
    });
    expect(wrapper.find('a').exists()).toBe(false);
    expect(wrapper.text()).toContain('Worker mode');
    expect(wrapper.text()).toContain('Notify');
    expect(wrapper.text()).toContain('Enabled');
  });

  it('states a breakdown in words beside its bar', () => {
    const wrapper = mount(MetricTile, {
      props: {
        label: 'Runs',
        value: '3',
        segments: [
          { status: 'suggestion-run-completed', count: 2 },
          { status: 'suggestion-run-failed', count: 1 },
          { status: 'suggestion-run-running', count: 0 },
        ],
      },
      global: { plugins: [router] },
    });
    expect(wrapper.text()).toContain('2 completed, 1 failed');
    expect(wrapper.text()).not.toContain('running');
  });
});
