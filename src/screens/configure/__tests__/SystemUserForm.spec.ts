import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import SystemUserForm from '../SystemUserForm.vue';

const api = vi.hoisted(() => ({
  post: vi.fn(() => Promise.resolve({ data: { data: { uuid: 'u-9' } } })),
  put: vi.fn(() => Promise.resolve({ data: { data: { uuid: 'u-1' } } })),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

describe('SystemUserForm', () => {
  it('splits role IDs and functions on commas and keeps the rest of an edited user', async () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(TooltipProvider, null, () =>
            h(SystemUserForm, {
              sspId: 'ssp-1',
              user: {
                uuid: 'u-1',
                title: 'Operator',
                description: 'Runs it',
                remarks: 'keep me',
                roleIds: ['operator'],
                authorizedPrivileges: [
                  { title: 'Deploy', functionsPerformed: ['release'] },
                ],
              },
            }),
          ),
      }),
      { attachTo: document.body },
    );
    const inputs = wrapper.findAll('input');
    // Title, short name, role IDs, then the privilege's title, description and functions.
    await inputs[2]!.setValue('operator, , on-call');
    await inputs[5]!.setValue('release, rollback');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const [url, body] = api.put.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(url).toBe(
      '/api/oscal/system-security-plans/ssp-1/system-implementation/users/u-1',
    );
    expect(body).toMatchObject({
      remarks: 'keep me',
      roleIds: ['operator', 'on-call'],
      authorizedPrivileges: [
        { title: 'Deploy', functionsPerformed: ['release', 'rollback'] },
      ],
    });
    expect(wrapper.findComponent(SystemUserForm).emitted('saved')).toHaveLength(
      1,
    );
    wrapper.unmount();
  });
});
