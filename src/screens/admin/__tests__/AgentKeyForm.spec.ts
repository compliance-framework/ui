import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { TooltipProvider } from 'reka-ui';
import AgentKeyForm from '../AgentKeyForm.vue';

const api = vi.hoisted(() => ({
  post: vi.fn<
    (url: string, body: unknown, config: unknown) => Promise<unknown>
  >(),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));
vi.mock('@/stores/config', () => ({
  useConfigStore: () => ({
    getConfig: async () => ({ API_URL: 'https://api.example.test/' }),
  }),
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

const createdKey = {
  id: 'key-2',
  name: 'primary',
  clientId: 'client-id-2',
  clientSecret: 'client-secret-2',
  neverExpires: true,
  createdAt: '2026-04-06T12:00:00Z',
  updatedAt: '2026-04-06T12:00:00Z',
};

function mountForm() {
  const events: string[] = [];
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(AgentKeyForm, {
            agentId: 'agent-1',
            onCreated: () => events.push('created'),
            onClose: () => events.push('close'),
          }),
        ),
    }),
  );
  return { wrapper, events };
}

const field = (wrapper: ReturnType<typeof mount>, label: string) => {
  const el = wrapper
    .findAll('label')
    .find((l) => l.text().replace('*', '').trim() === label)!;
  return wrapper.find(`[id="${el.attributes('for')}"]`);
};

describe('AgentKeyForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    api.post.mockReset().mockResolvedValue({ data: { data: createdKey } });
  });

  it('creates a never-expiring key and shows its secret and sign-in command once', async () => {
    const { wrapper, events } = mountForm();
    await field(wrapper, 'Name').setValue('primary');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const [url, body] = api.post.mock.calls[0]!;
    expect(url).toBe('/api/admin/agents/agent-1/keys');
    expect(body).toEqual({ name: 'primary', neverExpires: true });
    expect(events).toEqual(['created']);
    expect(wrapper.text()).toContain('client-secret-2');
    expect(wrapper.text()).toContain("--user 'client-id-2:client-secret-2'");
    expect(wrapper.text()).toContain(
      'https://api.example.test/api/auth/agent/token',
    );
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('creates an expiring key with a future expiry', async () => {
    const { wrapper } = mountForm();
    await field(wrapper, 'Never expires').setValue(false);
    const future = new Date(Date.now() + 86_400_000);
    const local = new Date(
      future.getTime() - future.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);
    await field(wrapper, 'Expires at').setValue(local);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const body = api.post.mock.calls[0]![1] as Record<string, unknown>;
    expect(body.neverExpires).toBe(false);
    expect(new Date(body.expiresAt as string).getTime()).toBeGreaterThan(
      Date.now(),
    );
  });

  it('refuses an expiry in the past', async () => {
    const { wrapper } = mountForm();
    await field(wrapper, 'Never expires').setValue(false);
    await field(wrapper, 'Expires at').setValue('2020-01-01T10:00');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Choose a time in the future.');
    expect(api.post).not.toHaveBeenCalled();
  });
});
