import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import InlineTabs from '../components/InlineTabs/InlineTabs.vue';

const tabs = [
  { value: 'ssh', label: 'ssh' },
  { value: 'aws', label: 'aws', describedby: 'aws-note' },
  { value: 'k8s', label: 'k8s' },
];

function mountTabs() {
  return mount(
    defineComponent({
      components: { InlineTabs },
      setup: () => ({ tabs, selected: ref('ssh') }),
      template: `<div>
        <InlineTabs v-model="selected" :tabs="tabs" label="Plugins">
          <template #tab="{ tab, selected: on }">{{ tab.label }}{{ on ? ' (on)' : '' }}</template>
          <template #panel="{ tab }"><input :aria-label="'Field of ' + tab.value" /></template>
          <template #end><button type="button">Add plugin</button></template>
        </InlineTabs>
        <span id="aws-note">Not installed</span>
      </div>`,
    }),
    { attachTo: document.body },
  );
}

describe('InlineTabs', () => {
  it('renders a named tablist with linked tabs and panels', () => {
    const wrapper = mountTabs();
    const list = wrapper.find('[role="tablist"]');
    expect(list.attributes('aria-label')).toBe('Plugins');
    const tabEls = wrapper.findAll('[role="tab"]');
    expect(tabEls.map((t) => t.text())).toEqual(['ssh (on)', 'aws', 'k8s']);
    expect(tabEls[0].attributes('aria-selected')).toBe('true');
    expect(tabEls[0].attributes('tabindex')).toBe('0');
    expect(tabEls[1].attributes('tabindex')).toBe('-1');
    expect(tabEls[1].attributes('aria-describedby')).toBe('aws-note');
    const panel = wrapper.find(`#${tabEls[0].attributes('aria-controls')}`);
    expect(panel.attributes('role')).toBe('tabpanel');
    expect(panel.attributes('aria-labelledby')).toBe(
      tabEls[0].attributes('id'),
    );
    // The end slot sits outside the tablist.
    expect(list.text()).not.toContain('Add plugin');
    expect(wrapper.text()).toContain('Add plugin');
    wrapper.unmount();
  });

  it('selects on click and keeps every panel mounted', async () => {
    const wrapper = mountTabs();
    await wrapper.find('[data-panel="ssh"] input').setValue('typed');
    await wrapper.find('[data-tab="aws"]').trigger('click');
    expect(wrapper.find('[data-tab="aws"]').attributes('aria-selected')).toBe(
      'true',
    );
    expect(
      (wrapper.find('[data-panel="ssh"]').element as HTMLElement).style.display,
    ).toBe('none');
    await wrapper.find('[data-tab="ssh"]').trigger('click');
    expect(
      (wrapper.find('[data-panel="ssh"] input').element as HTMLInputElement)
        .value,
    ).toBe('typed');
    wrapper.unmount();
  });

  it('moves and selects with arrow keys, Home and End', async () => {
    const wrapper = mountTabs();
    const list = wrapper.find('[role="tablist"]');
    const selected = () =>
      wrapper.find('[role="tab"][aria-selected="true"]').attributes('data-tab');
    await list.trigger('keydown', { key: 'ArrowRight' });
    expect(selected()).toBe('aws');
    expect(document.activeElement).toBe(
      wrapper.find('[data-tab="aws"]').element,
    );
    await list.trigger('keydown', { key: 'End' });
    expect(selected()).toBe('k8s');
    await list.trigger('keydown', { key: 'ArrowRight' });
    expect(selected()).toBe('ssh');
    await list.trigger('keydown', { key: 'ArrowLeft' });
    expect(selected()).toBe('k8s');
    await list.trigger('keydown', { key: 'Home' });
    expect(selected()).toBe('ssh');
    wrapper.unmount();
  });
});
