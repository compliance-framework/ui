import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ControlStatementByComponents from '../ControlStatementByComponents.vue';
import type { ByComponent } from '@/oscal';

const { permState } = vi.hoisted(() => ({
  permState: { can: true },
}));

vi.mock('@/stores/system', () => ({
  useSystemStore: () => ({ system: { securityPlan: { uuid: 'ssp-1' } } }),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: () => permState.can,
    permissionTooltip: () => '',
  }),
}));

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
  Menu: {
    props: ['items', 'label'],
    template:
      '<div data-test="burger-menu"><button v-for="item in items" :key="item.label" type="button" @click="item.onSelect()">{{ item.label }}</button></div>',
  },
  ByComponentStatement: {
    props: ['byComponent'],
    emits: ['save', 'delete'],
    template:
      '<section data-test="statement-by-component"><button type="button" @click="$emit(\'save\', byComponent)">Save</button><button type="button" @click="$emit(\'delete\', byComponent)">Delete</button></section>',
  },
};

describe('ControlStatementByComponents', () => {
  beforeEach(() => {
    permState.can = true;
  });

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

  function menuLabels(wrapper: ReturnType<typeof mountComponent>) {
    return wrapper
      .findAll('[data-test="burger-menu"] button')
      .map((b) => b.text());
  }

  it('renders one StatementByComponent per item with dividers only between items', () => {
    const wrapper = mountComponent();

    expect(
      wrapper.findAll('[data-test="statement-by-component"]'),
    ).toHaveLength(2);
  });

  it('emits addComponent, createComponent and inheritFromSsp from burger menu commands', async () => {
    const wrapper = mountComponent();

    expect(menuLabels(wrapper)).toEqual([
      'Add Component',
      'Create New Component',
      'Inherit from SSP',
    ]);

    const buttons = wrapper.findAll('[data-test="burger-menu"] button');
    await buttons[0].trigger('click');
    await buttons[1].trigger('click');
    await buttons[2].trigger('click');

    expect(wrapper.emitted('addComponent')).toHaveLength(1);
    expect(wrapper.emitted('createComponent')).toHaveLength(1);
    expect(wrapper.emitted('inheritFromSsp')).toHaveLength(1);
  });

  it('hides Inherit from SSP without the subscribe/update permissions', () => {
    permState.can = false;
    const wrapper = mountComponent();

    expect(menuLabels(wrapper)).toEqual([
      'Add Component',
      'Create New Component',
    ]);
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
