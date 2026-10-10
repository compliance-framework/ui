import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import PrimeVue from 'primevue/config';
import type { ByComponent, ImplementedRequirement, Statement } from '@/oscal';
import ByComponentModalForm from '../ByComponentModalForm.vue';

enableAutoUnmount(afterEach);

const persistByComponent = vi.fn();
const persisted = ref<ByComponent | undefined>();

vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(() => ({
    data: persisted,
    execute: persistByComponent,
    isLoading: ref(false),
  })),
  useAuthenticatedInstance: vi.fn(),
  decamelizeKeys: (data: unknown) => data,
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

const DrawerStub = defineComponent({
  emits: ['close'],
  setup:
    (_, { slots, emit }) =>
    () =>
      h('div', [
        h('button', { id: 'drawer-close', onClick: () => emit('close') }),
        slots.default?.(),
      ]),
});

// Stand-in for the dedicated editors: exposes the v-models it receives.
const EditorsStub = defineComponent({
  name: 'SharedResponsibilityEditors',
  props: ['export', 'inherited', 'satisfied', 'byComponentId'],
  emits: ['update:inherited'],
  setup: (props) => () =>
    h('div', { id: 'editors' }, `editing ${props.byComponentId}`),
});

const requirement = {
  uuid: 'req-1',
  controlId: 'ac-2',
} as ImplementedRequirement;
const statement = { uuid: 'stmt-1', statementId: 'ac-2_smt' } as Statement;
const existing = {
  uuid: 'bc-1',
  componentUuid: 'comp-1',
  description: 'Handles account management',
  props: [],
  links: [],
  setParameters: [],
  remarks: '',
  implementationStatus: { state: 'implemented', remarks: '' },
  responsibleRoles: [{ roleId: 'admin', partyUuids: ['p-1'] }],
  export: {
    uuid: 'exp-1',
    description: 'Exported',
    provided: [],
    responsibilities: [],
  },
  inherited: [
    { uuid: 'inh-1', providedUuid: 'prov-1', description: 'Inherited' },
  ],
  satisfied: [],
} as unknown as ByComponent;

function mountForm(byComponent?: ByComponent) {
  return mount(ByComponentModalForm, {
    props: {
      sspId: 'ssp-1',
      requirement,
      statement,
      byComponent,
      systemComponents: [
        { uuid: 'comp-1', title: 'App', type: 'software' },
      ] as never,
      preferredComponentUuid: 'comp-1',
    },
    global: {
      plugins: [[PrimeVue, { unstyled: true }]],
      stubs: {
        V2EditorDrawer: DrawerStub,
        SharedResponsibilityEditors: EditorsStub,
      },
    },
  });
}

describe('ByComponentModalForm', () => {
  beforeEach(() => {
    persistByComponent.mockReset().mockResolvedValue(undefined);
  });

  it('saves only the fields the by-component PUT writes', async () => {
    persisted.value = {
      ...existing,
      export: undefined,
      inherited: undefined,
    } as ByComponent;
    const wrapper = mountForm(existing);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const [url, config] = persistByComponent.mock.calls[0]!;
    expect(url).toContain('/statements/stmt-1/by-components/bc-1');
    expect(config.method).toBe('PUT');
    for (const key of [
      'export',
      'inherited',
      'satisfied',
      'responsibleRoles',
    ]) {
      expect(config.data).not.toHaveProperty(key);
    }
    expect(config.data).toMatchObject({
      description: 'Handles account management',
    });
  });

  it('keeps shared responsibility in the saved result', async () => {
    persisted.value = {
      ...existing,
      export: undefined,
      inherited: undefined,
    } as ByComponent;
    const wrapper = mountForm(existing);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const [saved] = wrapper.emitted('saved')![0] as [ByComponent];
    expect(saved.export).toEqual(existing.export);
    expect(saved.inherited).toEqual(existing.inherited);
    expect(saved.responsibleRoles).toEqual(existing.responsibleRoles);
  });

  it('sends responsible roles but no shared responsibility on create', async () => {
    persisted.value = existing;
    const wrapper = mountForm();
    await wrapper
      .find('#by-component-description')
      .setValue('New implementation');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const [, config] = persistByComponent.mock.calls[0]!;
    expect(config.method).toBe('POST');
    expect(config.data).toHaveProperty('responsibleRoles');
    for (const key of ['export', 'inherited', 'satisfied']) {
      expect(config.data).not.toHaveProperty(key);
    }
  });

  it('uses the dedicated editors when editing and explains create mode', async () => {
    const editing = mountForm(existing);
    expect(editing.find('#editors').text()).toBe('editing bc-1');

    const creating = mountForm();
    expect(creating.find('#editors').exists()).toBe(false);
    expect(creating.text()).toContain(
      'Create this component implementation first',
    );
  });

  it('reports editor changes when the drawer is closed', async () => {
    const wrapper = mountForm(existing);
    const updated = [
      { uuid: 'inh-2', providedUuid: 'prov-2', description: 'New' },
    ];
    wrapper.findComponent(EditorsStub).vm.$emit('update:inherited', updated);
    await flushPromises();
    await wrapper.find('#drawer-close').trigger('click');

    expect(wrapper.emitted('cancel')).toBeUndefined();
    const [saved] = wrapper.emitted('saved')![0] as [ByComponent];
    expect(saved.inherited).toEqual(updated);
  });

  it('just cancels when nothing changed', async () => {
    const wrapper = mountForm(existing);
    await wrapper.find('#drawer-close').trigger('click');

    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('saved')).toBeUndefined();
  });
});
