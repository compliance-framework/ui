import { describe, expect, it } from 'vitest';
import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import Tree from '@/ds/components/TreeItem/Tree.vue';
import TreeItem from '@/ds/components/TreeItem/TreeItem.vue';

const Harness = defineComponent({
  components: { Tree, TreeItem },
  setup: () => ({ open: ref(false) }),
  template: `
    <Tree label="Controls">
      <TreeItem v-model:open="open" label="Access control" expandable>
        Access control
        <template #children>
          <TreeItem label="AC-1">AC-1</TreeItem>
        </template>
      </TreeItem>
    </Tree>`,
});

describe('TreeItem', () => {
  it('toggles its children with a named button that reports its state', async () => {
    const wrapper = mount(Harness, {
      global: { stubs: { Tooltip: { template: '<slot />' } } },
    });
    expect(wrapper.get('ul').attributes('aria-label')).toBe('Controls');

    const toggle = wrapper.get('button');
    expect(toggle.attributes('aria-label')).toBe('Expand Access control');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(wrapper.text()).not.toContain('AC-1');

    await toggle.trigger('click');

    expect(toggle.attributes('aria-label')).toBe('Collapse Access control');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    const children = wrapper.get(`#${toggle.attributes('aria-controls')}`);
    expect(children.text()).toContain('AC-1');
    // A leaf has no toggle.
    expect(wrapper.findAll('button')).toHaveLength(1);
  });
});
