import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ControlStatementByComponents from '../ControlStatementByComponents.vue';
import type { ByComponent } from '@/oscal';

const byComponents = [
  {
    uuid: 'by-component-1',
    componentUuid: 'component-1',
    description: 'Component one implementation',
  },
  {
    uuid: 'by-component-2',
    componentUuid: 'component-2',
    description: 'Component two implementation',
  },
] as ByComponent[];

const stubs = {
  TooltipTitle: {
    props: ['text'],
    template: '<h2>{{ text }}</h2>',
  },
  BurgerMenu: {
    props: ['items'],
    template:
      '<div data-test="burger-menu"><button v-for="item in items" :key="item.label" type="button" @click="item.command()">{{ item.label }}</button></div>',
  },
  StatementByComponent: {
    props: ['byComponent'],
    emits: ['save', 'delete'],
    template:
      '<section data-test="statement-by-component"><button type="button" @click="$emit(\'save\', byComponent)">Save</button><button type="button" @click="$emit(\'delete\', byComponent)">Delete</button></section>',
  },
};

describe('ControlStatementByComponents', () => {
  function mountComponent(items = byComponents) {
    return mount(ControlStatementByComponents, {
      props: {
        byComponents: items,
        controlId: 'ac-1',
        sspRisks: [],
        riskFetchLimit: 100,
      },
      global: { stubs },
    });
  }

  it('renders one StatementByComponent per item with dividers only between items', () => {
    const wrapper = mountComponent();

    expect(wrapper.findAll('[data-test="statement-by-component"]')).toHaveLength(
      2,
    );
    expect(wrapper.findAll('.h-0\\.5')).toHaveLength(1);
  });

  it('emits addComponent and createComponent from burger menu commands', async () => {
    const wrapper = mountComponent();

    await wrapper.findAll('[data-test="burger-menu"] button')[0].trigger('click');
    await wrapper.findAll('[data-test="burger-menu"] button')[1].trigger('click');

    expect(wrapper.emitted('addComponent')).toHaveLength(1);
    expect(wrapper.emitted('createComponent')).toHaveLength(1);
  });

  it('re-emits save and delete events with the same ByComponent payload', async () => {
    const wrapper = mountComponent();
    const firstStatement = wrapper.findAll(
      '[data-test="statement-by-component"]',
    )[0];

    await firstStatement.findAll('button')[0].trigger('click');
    await firstStatement.findAll('button')[1].trigger('click');

    expect(wrapper.emitted('save')?.[0]).toEqual([byComponents[0]]);
    expect(wrapper.emitted('delete')?.[0]).toEqual([byComponents[0]]);
  });
});
