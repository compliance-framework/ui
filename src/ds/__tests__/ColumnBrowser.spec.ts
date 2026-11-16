import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ColumnBrowser from '@/ds/components/ColumnBrowser/ColumnBrowser.vue';

describe('ColumnBrowser', () => {
  it('renders each column as a region named by its heading', () => {
    const wrapper = mount(ColumnBrowser, {
      props: {
        label: 'Map',
        columns: [
          { key: 'c0', title: 'Top level' },
          { key: 'c1', title: 'Access control' },
        ],
      },
      slots: {
        column: '<template #column="{ index }">Column {{ index }}</template>',
      },
    });
    const sections = wrapper.findAll('section');
    expect(sections).toHaveLength(2);
    expect(sections[1].attributes('aria-labelledby')).toBe('c1-heading');
    expect(wrapper.get('#c1-heading').text()).toBe('Access control');
    expect(sections[1].text()).toContain('Column 1');
  });

  it('scrolls sideways to the newest column', async () => {
    const wrapper = mount(ColumnBrowser, {
      props: { label: 'Map', columns: [{ key: 'c0', title: 'Top level' }] },
    });
    const scroller = wrapper.get('[role="group"]').element as HTMLElement;
    scroller.scrollTo = vi.fn();
    await (
      wrapper.vm as unknown as { revealLast(): Promise<void> }
    ).revealLast();
    expect(scroller.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ left: scroller.scrollWidth }),
    );
  });
});
