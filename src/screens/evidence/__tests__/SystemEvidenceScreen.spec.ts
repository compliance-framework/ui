import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import SystemEvidenceScreen from '../SystemEvidenceScreen.vue';

const api = vi.hoisted(() => ({
  hasScope: true,
  post: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ post: api.post }),
}));
vi.mock('@/composables/useSspScope', () => ({
  sspHasScopeEntries: () => Promise.resolve(api.hasScope),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

const evidence = (id: string, title: string, state: string) => ({
  id,
  uuid: id,
  title,
  status: { state, reason: '' },
  end: '2026-11-05T09:55:00Z',
  labels: [],
});

async function mountScreen(path = '/next/systems/sys-1/evidence') {
  const Stub = defineComponent({ render: () => h('div') });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/next/systems/:systemId/evidence',
        name: 'ds-system-evidence',
        component: SystemEvidenceScreen,
      },
      { path: '/evidence/:id', name: 'evidence:view', component: Stub },
      { path: '/system/evidence', name: 'system:evidence', component: Stub },
      { path: '/system/scope', name: 'system:scope', component: Stub },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(SystemEvidenceScreen)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, router };
}

describe('SystemEvidenceScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    api.hasScope = true;
    api.post.mockReset();
    api.post.mockResolvedValue({
      data: {
        data: [
          evidence('e1', 'Backups verified', 'satisfied'),
          evidence('e2', 'MFA enforced', 'not-satisfied'),
        ],
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      },
    });
  });

  it("searches the system's scoped endpoint with the URL's view", async () => {
    await mountScreen(
      '/next/systems/sys-1/evidence?filter=provider%3Daws&sortBy=name&sortDirection=asc',
    );
    const [url, body, config] = api.post.mock.calls[0]!;
    expect(url).toBe('/api/oscal/system-security-plans/sys-1/evidence/search');
    expect(JSON.stringify(body.filter)).toContain('provider');
    expect(config.params).toEqual(
      expect.objectContaining({
        sortBy: 'name',
        sortDirection: 'asc',
        page: '1',
      }),
    );
  });

  it('lists evidence with its status, linking to the classic record', async () => {
    const { wrapper } = await mountScreen();
    expect(wrapper.text()).toContain('Satisfied');
    expect(wrapper.text()).toContain('Not satisfied');
    const link = wrapper.findAll('tbody a')[0]!;
    expect(link.text()).toBe('Backups verified');
    expect(link.attributes('href')).toBe('/evidence/e1?from=system');
  });

  it('carries the view to the classic page', async () => {
    const { wrapper } = await mountScreen(
      '/next/systems/sys-1/evidence?sortBy=name&sortDirection=asc',
    );
    const classic = wrapper
      .findAll('a')
      .find((a) => a.text().includes('Open classic view'));
    expect(classic!.attributes('href')).toBe(
      '/system/evidence?sortBy=name&sortDirection=asc',
    );
  });

  it('does not send an invalid search, and explains why', async () => {
    const { wrapper } = await mountScreen();
    api.post.mockClear();
    await wrapper.find('input').setValue('provider=');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.post).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Finish the condition with a value.');
  });

  it('asks for a scope when the system has none', async () => {
    api.hasScope = false;
    const { wrapper } = await mountScreen();
    expect(wrapper.text()).toContain("Define this system's scope");
    expect(api.post).not.toHaveBeenCalled();
  });
});
