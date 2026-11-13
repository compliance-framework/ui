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
  get: vi.fn(() => Promise.resolve({ data: { data: [] } })),
  download: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ post: api.post, get: api.get }),
}));
vi.mock('@/utils/evidence-csv', async (original) => ({
  ...(await original<typeof import('@/utils/evidence-csv')>()),
  downloadCsv: api.download,
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
  labels: [
    { name: 'provider', value: 'aws' },
    { name: '_policy', value: 'backups' },
  ],
});

/** The search calls (not the status trend's) made so far. */
const searchCalls = () =>
  api.post.mock.calls.filter(([url]) => String(url).endsWith('/search'));

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
      {
        path: '/dashboards/create',
        name: 'dashboards.create',
        component: Stub,
      },
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
    api.download.mockReset();
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
    const [url, body, config] = searchCalls()[0]!;
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
    expect(searchCalls()).toHaveLength(0);
    expect(wrapper.text()).toContain('Finish the condition with a value.');
  });

  it('asks for a scope when the system has none', async () => {
    api.hasScope = false;
    const { wrapper } = await mountScreen();
    expect(wrapper.text()).toContain("Define this system's scope");
    expect(api.post).not.toHaveBeenCalled();
  });

  it('saves the applied search as a filter for this system', async () => {
    const { wrapper } = await mountScreen(
      '/next/systems/sys-1/evidence?filter=provider%3Daws',
    );
    const save = wrapper
      .findAll('a')
      .find((a) => a.text().includes('Save as filter'));
    expect(save!.attributes('href')).toBe(
      '/dashboards/create?filter=provider=aws&sspId=sys-1',
    );
  });

  it('exports every page of the applied search as CSV', async () => {
    const page = (n: number) => ({
      data: {
        data: [evidence(`e${n}`, `Item ${n}`, 'satisfied')],
        total: 2,
        page: n,
        limit: 100,
        totalPages: 2,
      },
    });
    api.post.mockImplementation((url: string, _body: unknown, config) =>
      Promise.resolve(
        url.endsWith('/search')
          ? page(Number(config?.params?.page ?? 1))
          : { data: { data: [] } },
      ),
    );
    const { wrapper } = await mountScreen();
    const exportButton = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Export CSV'));
    await exportButton!.trigger('click');
    await flushPromises();
    expect(api.download).toHaveBeenCalledTimes(1);
    const csv = api.download.mock.calls[0]![0] as string;
    expect(csv).toContain('Item 1');
    expect(csv).toContain('Item 2');
  });

  it('shows labels, hiding system labels until asked', async () => {
    const { wrapper } = await mountScreen();
    expect(wrapper.text()).toContain('provider=aws');
    expect(wrapper.text()).not.toContain('_policy=backups');
  });

  it('charts the status trend for the applied search', async () => {
    await mountScreen('/next/systems/sys-1/evidence?filter=backups');
    const trend = api.post.mock.calls.find(([url]) =>
      String(url).endsWith('/status-over-time'),
    );
    expect(trend![0]).toBe(
      '/api/oscal/system-security-plans/sys-1/evidence/status-over-time',
    );
    expect(trend![2].params).toEqual(
      expect.objectContaining({ name: 'backups' }),
    );
  });
});
