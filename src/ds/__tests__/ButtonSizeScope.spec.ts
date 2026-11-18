import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import Button from '../components/Button/Button.vue';
import ButtonSizeScope from '../components/Button/ButtonSizeScope.vue';
import IconButton from '../components/IconButton/IconButton.vue';
import Panel from '../components/layout/Panel.vue';

const stubs = { Tooltip: { template: '<slot />' } };

describe('ButtonSizeScope', () => {
  it('leaves buttons at the medium size outside a scope', () => {
    const wrapper = mount(Button, { slots: { default: 'Save' } });
    expect(wrapper.find('button').classes()).toContain('button--md');
  });

  it('sets the default size of buttons and icon buttons inside it', () => {
    const wrapper = mount(
      defineComponent(
        () => () =>
          h(ButtonSizeScope, { size: 'sm' }, () => [
            h(Button, null, () => 'Add'),
            h(IconButton, { icon: 'edit', label: 'Edit' }),
          ]),
      ),
      { global: { stubs } },
    );
    const [button, iconButton] = wrapper.findAll('button');
    expect(button!.classes()).toContain('button--sm');
    expect(iconButton!.classes()).toContain('icon-button--sm');
  });

  it("lets a button's own size win", () => {
    const wrapper = mount(
      defineComponent(
        () => () =>
          h(ButtonSizeScope, { size: 'sm' }, () =>
            h(Button, { size: 'md' }, () => 'Add'),
          ),
      ),
    );
    expect(wrapper.find('button').classes()).toContain('button--md');
  });

  it("makes a panel's header actions small but not its content", () => {
    const wrapper = mount(Panel, {
      props: { title: 'Diagrams' },
      slots: {
        actions: () => h(Button, null, () => 'Add diagram'),
        default: () => h(Button, null, () => 'Save'),
      },
    });
    const [action, content] = wrapper.findAll('button');
    expect(action!.text()).toBe('Add diagram');
    expect(action!.classes()).toContain('button--sm');
    expect(content!.classes()).toContain('button--md');
  });
});
