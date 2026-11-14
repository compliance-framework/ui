import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import { useSystemStore } from '@/stores/system';
import DocumentForms from '../DocumentForms.vue';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => data,
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

enableAutoUnmount(afterEach);

async function mountForm(path: string) {
  const Stub = { render: () => null };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/assessment-plans', name: 'assessment-plans', component: Stub },
      {
        path: '/assessment-plans/create',
        name: 'assessment-plan-create',
        component: DocumentForms,
      },
      {
        path: '/assessment-plans/:id',
        name: 'assessment-plan-overview',
        component: Stub,
      },
      { path: '/systems', name: 'systems', component: Stub },
      {
        path: '/assessment-results',
        name: 'assessment-results',
        component: Stub,
      },
      {
        path: '/assessment-results/create',
        name: 'assessment-results-create',
        component: DocumentForms,
      },
      {
        path: '/assessment-results/:id',
        name: 'assessment-results-overview',
        component: Stub,
      },
      {
        path: '/assessment-results/:id/edit',
        name: 'assessment-results-edit',
        component: DocumentForms,
      },
      {
        path: '/system-security-plans/create',
        name: 'system-security-plans-create',
        component: DocumentForms,
      },
      {
        path: '/systems/:systemId/configure',
        name: 'system-configure',
        component: Stub,
      },
      { path: '/catalogs', name: 'catalog-list', component: Stub },
      {
        path: '/catalogs/new',
        name: 'catalog-create',
        component: DocumentForms,
      },
      { path: '/catalogs/:id', name: 'catalog-view', component: Stub },
      {
        path: '/plan-of-action-and-milestones/:id',
        name: 'plan-of-action-and-milestones-overview',
        component: Stub,
      },
      {
        path: '/plan-of-action-and-milestones/:id/edit',
        name: 'plan-of-action-and-milestones-edit',
        component: DocumentForms,
      },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(DocumentForms)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, router };
}

const input = (
  wrapper: { findAll: (s: string) => { element: Element }[] },
  index: number,
) => wrapper.findAll('input')[index]!.element as HTMLInputElement;

describe('DocumentForms', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    api.get.mockReset();
    api.post.mockReset();
    api.put.mockReset();
  });

  it('checks a new assessment plan before creating it', async () => {
    const { wrapper } = await mountForm('/assessment-plans/create');
    expect(wrapper.find('h1').text()).toBe('New assessment plan');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Enter a title.');
    expect(wrapper.text()).toContain(
      'Enter the URL of the system security plan.',
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  it('creates an assessment plan and opens it', async () => {
    api.post.mockResolvedValue({ data: { data: { uuid: 'ap-9' } } });
    const { wrapper, router } = await mountForm('/assessment-plans/create');
    await wrapper.findAll('input')[1]!.setValue('Annual assessment');
    const url = wrapper.find('input[type="url"]');
    await url.setValue('not a url');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Enter a full URL');
    await url.setValue('https://example.com/ssp.json');
    const generatedId = input(wrapper, 0).value;
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.post).toHaveBeenCalledWith(
      '/api/oscal/assessment-plans',
      expect.objectContaining({
        uuid: generatedId,
        metadata: expect.objectContaining({
          title: 'Annual assessment',
          version: '1.0',
        }),
        importSsp: expect.objectContaining({
          href: 'https://example.com/ssp.json',
        }),
      }),
      expect.anything(),
    );
    expect(router.currentRoute.value.fullPath).toBe('/assessment-plans/ap-9');
  });

  it('edits a POA&M, sending the whole document back', async () => {
    api.get.mockResolvedValue({
      data: {
        data: {
          uuid: 'p-1',
          metadata: { title: 'Remediation plan', oscalVersion: '1.1.3' },
          poamItems: [{ uuid: 'i-1' }],
        },
      },
    });
    api.put.mockResolvedValue({ data: { data: { uuid: 'p-1' } } });
    const { wrapper, router } = await mountForm(
      '/plan-of-action-and-milestones/p-1/edit',
    );
    expect(api.get).toHaveBeenCalledWith(
      '/api/oscal/plan-of-action-and-milestones/p-1',
    );
    expect(wrapper.find('h1').text()).toBe('Edit Remediation plan');
    await wrapper.findAll('input')[0]!.setValue('Remediation plan 2027');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.put).toHaveBeenCalledWith(
      '/api/oscal/plan-of-action-and-milestones/p-1',
      expect.objectContaining({
        uuid: 'p-1',
        poamItems: [{ uuid: 'i-1' }],
        metadata: expect.objectContaining({
          title: 'Remediation plan 2027',
          oscalVersion: '1.1.3',
        }),
      }),
      expect.anything(),
    );
    expect(router.currentRoute.value.fullPath).toBe(
      '/plan-of-action-and-milestones/p-1',
    );
  });

  it('creates a system, makes it current, and opens Configure System', async () => {
    api.post.mockResolvedValue({
      data: { data: { uuid: 'ssp-9', metadata: { title: 'Payments' } } },
    });
    const store = useSystemStore();
    store.setAvailablePlans([]);
    const { wrapper, router } = await mountForm(
      '/system-security-plans/create',
    );
    const version = wrapper.findAll('input')[2]!;
    await version.setValue('');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Enter a title.');
    expect(wrapper.text()).toContain('Enter a version');
    await wrapper.findAll('input')[1]!.setValue('Payments');
    await version.setValue('2.0.0');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(store.system.securityPlan?.uuid).toBe('ssp-9');
    expect(store.availablePlans.map((p) => p.uuid)).toEqual(['ssp-9']);
    expect(router.currentRoute.value.fullPath).toBe('/systems/ssp-9/configure');
  });

  it("stamps a catalog's type as a metadata prop", async () => {
    api.post.mockResolvedValue({ data: { data: { uuid: 'cat-9' } } });
    const { wrapper } = await mountForm('/catalogs/new');
    await wrapper.findAll('input')[1]!.setValue('Access policy');
    wrapper
      .findComponent({ name: 'Select' })
      .vm.$emit('update:modelValue', 'policy');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.post).toHaveBeenCalledWith(
      '/api/oscal/catalogs',
      expect.objectContaining({
        metadata: expect.objectContaining({
          title: 'Access policy',
          props: [
            expect.objectContaining({ name: 'catalog-type', value: 'policy' }),
          ],
        }),
      }),
      expect.anything(),
    );
  });

  it('creates assessment results with their first result', async () => {
    api.post.mockResolvedValue({ data: { data: { uuid: 'ar-9' } } });
    const { wrapper, router } = await mountForm('/assessment-results/create');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain(
      'Enter a reference to the assessment plan.',
    );
    expect(wrapper.text()).toContain('Name the first result.');
    const field = (placeholder: string) =>
      wrapper.find(`input[placeholder="${placeholder}"]`);
    await wrapper.findAll('input')[1]!.setValue('Q4 results');
    await field('#assessment-plan-uuid').setValue('#ap-1');
    await field('Initial assessment result').setValue('Q4 run');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.post).toHaveBeenCalledWith(
      '/api/oscal/assessment-results',
      expect.objectContaining({
        importAp: expect.objectContaining({ href: '#ap-1' }),
        results: [expect.objectContaining({ title: 'Q4 run' })],
      }),
      expect.anything(),
    );
    expect(router.currentRoute.value.fullPath).toBe('/assessment-results/ar-9');
  });

  it('edits assessment results from the full document, so results go back too', async () => {
    api.get.mockResolvedValue({
      data: {
        data: {
          uuid: 'ar-1',
          metadata: { title: 'Q4' },
          importAp: { href: '#ap-1' },
          results: [{ uuid: 'r-1', title: 'Run' }],
        },
      },
    });
    api.put.mockResolvedValue({ data: { data: { uuid: 'ar-1' } } });
    const { wrapper } = await mountForm('/assessment-results/ar-1/edit');
    expect(api.get).toHaveBeenCalledWith(
      '/api/oscal/assessment-results/ar-1/full',
    );
    // The form is prefilled with the stored import-ap reference.
    expect(
      (
        wrapper.find('input[placeholder="#assessment-plan-uuid"]')
          .element as HTMLInputElement
      ).value,
    ).toBe('#ap-1');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.put).toHaveBeenCalledWith(
      '/api/oscal/assessment-results/ar-1',
      expect.objectContaining({ results: [{ uuid: 'r-1', title: 'Run' }] }),
      expect.anything(),
    );
  });
});
