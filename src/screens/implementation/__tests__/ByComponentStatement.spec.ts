import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuAction } from '@/ds/components/Menu/menuEntries';
import type { ByComponent, Risk } from '@/oscal';
import ByComponentStatement from '../ByComponentStatement.vue';

vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref({ uuid: 'comp-1', title: 'Payments API' }),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));

const byComponent: ByComponent = {
  uuid: 'bc-1',
  componentUuid: 'comp-1',
  description: 'Changes go through **protected** branches.',
  implementationStatus: { state: 'partial', remarks: 'Two repos left' },
};

const risk = (status: string): Risk =>
  ({
    uuid: `r-${status}`,
    status,
    componentIds: ['COMP-1'],
    controlIds: ['ac-2'],
  }) as unknown as Risk;

async function mountCard(props: Record<string, unknown> = {}) {
  setActivePinia(createPinia());
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => null } },
      {
        path: '/risks',
        name: 'risks:index',
        component: { render: () => null },
      },
    ],
  });
  await router.push('/');
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(ByComponentStatement, {
            byComponent,
            controlId: 'AC-2',
            sspId: 'ssp-1',
            ...props,
          }),
        ),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return wrapper;
}

const action = (wrapper: ReturnType<typeof mount>, label: string) =>
  (wrapper.findComponent(Menu).props('items') as MenuAction[]).find(
    (i) => i.label === label,
  )!;

describe('ByComponentStatement', () => {
  it('shows the component, status, markdown statement, remarks and open risks for the control', async () => {
    const wrapper = await mountCard({
      sspRisks: [risk('open'), risk('closed')],
    });
    expect(wrapper.text()).toContain('Payments API');
    expect(wrapper.text()).toContain('Partial');
    expect(wrapper.find('strong').text()).toBe('protected');
    expect(wrapper.text()).toContain('Two repos left');
    expect(wrapper.find('a[href="/risks?controlId=AC-2"]').text()).toBe(
      '1 open risk',
    );
    wrapper.unmount();
  });

  it('edits in place and emits the updated statement and status', async () => {
    const wrapper = await mountCard();
    action(wrapper, 'Edit statement').onSelect!();
    await flushPromises();
    const statement = wrapper.find('textarea');
    await statement.setValue('Every repo is protected.');
    await wrapper.find('form').trigger('submit');
    const [saved] = wrapper
      .findComponent(ByComponentStatement)
      .emitted('save')![0] as [ByComponent];
    expect(saved.description).toBe('Every repo is protected.');
    expect(saved.implementationStatus).toEqual({
      state: 'partial',
      remarks: 'Two repos left',
    });
    expect(wrapper.find('form').exists()).toBe(false);
    wrapper.unmount();
  });

  it('asks before deleting', async () => {
    const wrapper = await mountCard();
    action(wrapper, 'Delete statement').onSelect!();
    await flushPromises();
    const confirm = wrapper.findComponent(ConfirmDialog);
    expect(confirm.props('title')).toBe(
      'Delete the statement for Payments API?',
    );
    confirm.vm.$emit('confirm');
    expect(
      wrapper.findComponent(ByComponentStatement).emitted('delete'),
    ).toEqual([[byComponent]]);
    wrapper.unmount();
  });

  it('disables editing, saying why, without permission', async () => {
    const wrapper = await mountCard({ editDeniedReason: 'No access.' });
    expect(action(wrapper, 'Edit statement').disabledReason).toBe('No access.');
    expect(action(wrapper, 'Delete statement').disabledReason).toBe(
      'No access.',
    );
    wrapper.unmount();
  });
});
