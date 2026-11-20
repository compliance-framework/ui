import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import Cluster from '../components/layout/Cluster.vue';

describe('Cluster grow', () => {
  it('lets the last child take the space when asked, for leading markers', () => {
    const wrapper = mount(Cluster, {
      props: { wrap: false, grow: 'last' },
      slots: { default: '<button>Edit</button><p>Text</p>' },
    });
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['cluster--nowrap', 'cluster--grow-last']),
    );
  });

  it('grows the first child by default', () => {
    const wrapper = mount(Cluster, { props: { wrap: false } });
    expect(wrapper.classes()).not.toContain('cluster--grow-last');
  });
});
