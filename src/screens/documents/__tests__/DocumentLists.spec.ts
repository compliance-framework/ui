import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import { useSystemStore } from '@/stores/system';
import DocumentLists from '../DocumentLists.vue';

const lists = vi.hoisted(() => ({ value: {} as Record<string, unknown[]> }));

vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string | null) => ({
    data: ref(url ? lists.value[url] : undefined),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));

vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

const doc = (uuid: string, title: string) => ({
  uuid,
  metadata: { title, version: '1.0', lastModified: '2026-11-02T00:00:00Z' },
});

async function mountLists(path: string) {
  const Stub = defineComponent({ render: () => h('div') });
  const named = (path: string, name: string) => ({
    path,
    name,
    component: Stub,
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profiles', name: 'profile-list', component: DocumentLists },
      {
        path: '/assessment-plans',
        name: 'assessment-plans',
        component: DocumentLists,
      },
      named('/profiles/create', 'profile:create'),
      named('/profiles/build-props', 'profile-build-props'),
      named('/profiles/:id', 'profile:view-controls'),
      named('/assessment-plans/create', 'assessment-plan-create'),
      named('/assessment-plans/:id', 'assessment-plan-overview'),
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(DocumentLists)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, router };
}

describe('DocumentLists', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    lists.value = {
      '/api/oscal/profiles': [doc('p2', 'Profile B'), doc('p1', 'Profile A')],
      '/api/oscal/assessment-plans': [doc('ap1', 'Annual assessment')],
    };
  });

  it('lists the documents of the route, sorted by title and linked to each', async () => {
    const { wrapper } = await mountLists('/profiles');
    expect(wrapper.find('h1').text()).toBe('Profiles');
    const links = wrapper.findAll('tbody a');
    expect(links.map((link) => link.text())).toEqual([
      'Profile A',
      'Profile B',
    ]);
    expect(links[0]!.attributes('href')).toBe('/profiles/p1');
    expect(wrapper.text()).toContain('Build profile from props');
  });

  it('filters by the search in the URL', async () => {
    const { wrapper } = await mountLists('/profiles?q=nothing');
    expect(wrapper.text()).toContain('Search: nothing');
    expect(wrapper.findAll('tbody a')).toHaveLength(0);
  });

  it('shows a fresh list when moving to another document type', async () => {
    const { wrapper, router } = await mountLists('/profiles');
    await router.push('/assessment-plans');
    await flushPromises();
    expect(wrapper.find('h1').text()).toBe('Assessment Plans');
    expect(wrapper.findAll('tbody a').map((a) => a.text())).toEqual([
      'Annual assessment',
    ]);
  });

  it('tags the active assessment plan', async () => {
    useSystemStore().setAssessmentPlan(
      doc('ap1', 'Annual assessment') as never,
    );
    const { wrapper } = await mountLists('/assessment-plans');
    expect(wrapper.find('tbody').text()).toContain('Active');
  });
});
