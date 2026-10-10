import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import PrimeVue from 'primevue/config';
import type {
  ByComponent,
  ImplementedRequirement,
  Statement,
  SystemComponent,
  SystemUser,
} from '@/oscal';
import SystemImplementationUserModalForm from '../SystemImplementationUserModalForm.vue';
import SystemImplementationComponentModalForm from '../SystemImplementationComponentModalForm.vue';
import ByComponentModalForm from '../ByComponentModalForm.vue';

enableAutoUnmount(afterEach);

const execute = vi.fn();
const persisted = ref<unknown>();

vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(() => ({
    data: persisted,
    execute,
    isLoading: ref(false),
  })),
  useAuthenticatedInstance: vi.fn(),
  decamelizeKeys: (data: unknown) => data,
}));
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

const DrawerStub = defineComponent({
  setup:
    (_, { slots }) =>
    () =>
      h('div', slots.default?.()),
});
const global = {
  plugins: [[PrimeVue, { unstyled: true }]] as never,
  stubs: { V2EditorDrawer: DrawerStub, SharedResponsibilityEditors: true },
};

// Shapes as they come from the seeded FedRAMP SSP (backlog M1-15).
describe('V2 SSP forms with real data', () => {
  beforeEach(() => {
    execute.mockReset().mockResolvedValue(undefined);
  });

  it('saves a seeded user that has no description', async () => {
    const user = {
      uuid: 'u-1',
      title: '[SAMPLE]Unix System Administrator',
      roleIds: [],
    } as unknown as SystemUser;
    persisted.value = user;
    const wrapper = mount(SystemImplementationUserModalForm, {
      props: { sspId: 'ssp-1', user },
      global,
    });
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).not.toContain('Description is required.');
  });

  it('does not resend existing privileges, which the API would duplicate', async () => {
    const user = {
      uuid: 'u-1',
      title: 'Admin',
      authorizedPrivileges: [
        { title: 'Root', functionsPerformed: ['backups'] },
        { title: 'Root', functionsPerformed: ['backups'] },
      ],
    } as unknown as SystemUser;
    persisted.value = user;
    const wrapper = mount(SystemImplementationUserModalForm, {
      props: { sspId: 'ssp-1', user },
      global,
    });

    // Existing privileges are listed once, read-only.
    expect(wrapper.text()).toContain("Existing privileges can't be changed");
    expect(wrapper.text().match(/Root/g)).toHaveLength(1);

    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const [, config] = execute.mock.calls[0]! as [string, { data: object }];
    expect(config.data).not.toHaveProperty('authorizedPrivileges');
  });

  it('sends only newly added privileges when editing', async () => {
    const user = {
      uuid: 'u-1',
      title: 'Admin',
      authorizedPrivileges: [{ title: 'Root', functionsPerformed: [] }],
    } as unknown as SystemUser;
    persisted.value = user;
    const wrapper = mount(SystemImplementationUserModalForm, {
      props: { sspId: 'ssp-1', user },
      global,
    });
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('ADD PRIVILEGE'))!
      .trigger('click');
    const titleInput = wrapper
      .findAll('input')
      .find((i) => (i.attributes('id') || '').includes('privilege-title'))!;
    await titleInput.setValue('Read-only auditor');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const [, config] = execute.mock.calls[0]! as [
      string,
      { data: { authorizedPrivileges?: Array<{ title: string }> } },
    ];
    expect(config.data.authorizedPrivileges?.map((p) => p.title)).toEqual([
      'Read-only auditor',
    ]);
  });

  it('shows a non-standard component type and saves without a purpose', async () => {
    const component = {
      uuid: 'c-1',
      type: 'leveraged-system',
      title: 'Name of Leveraged System',
      description: 'A leveraged system',
      status: { state: 'operational' },
    } as unknown as SystemComponent;
    persisted.value = component;
    const wrapper = mount(SystemImplementationComponentModalForm, {
      props: { sspId: 'ssp-1', component },
      global,
    });

    const select = wrapper.find('#system-component-type')
      .element as HTMLSelectElement;
    expect(select.value).toBe('leveraged-system');

    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).not.toContain('Purpose is required.');
  });

  it('omits an empty implementation status from a by-component save', async () => {
    persisted.value = { uuid: 'bc-1' };
    const wrapper = mount(ByComponentModalForm, {
      props: {
        sspId: 'ssp-1',
        requirement: {
          uuid: 'req-1',
          controlId: 'ac-2',
        } as ImplementedRequirement,
        statement: { uuid: 'stmt-1', statementId: 'ac-2_smt' } as Statement,
        systemComponents: [
          { uuid: 'comp-1', title: 'App', type: 'software' },
        ] as never,
        preferredComponentUuid: 'comp-1',
      },
      global,
    });
    await wrapper.find('#by-component-description').setValue('How it is done');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const [, config] = execute.mock.calls[0]! as [
      string,
      { data: Partial<ByComponent> },
    ];
    expect(config.data).not.toHaveProperty('implementationStatus');
  });
});
