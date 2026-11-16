import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import ConfirmDialog from '@/ds/components/ConfirmDialog/ConfirmDialog.vue';
import DocumentOverviewTab from '../DocumentOverviewTab.vue';

const api = vi.hoisted(() => ({ delete: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => ({
    data: ref(
      url.endsWith('/results')
        ? [{ uuid: 'r-1' }]
        : {
            uuid: 'ar-1',
            metadata: { title: 'IFA GoodRead AR', version: '1.0' },
            // As GET /assessment-results/:id returns it, camelCased; results come from /results.
            importAp: { href: './ap.oscal.xml', remarks: 'Imported plan' },
          },
    ),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => api,
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

async function mountTab() {
  const Stub = { render: () => null };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/assessment-results',
        name: 'assessment-results',
        component: Stub,
      },
      {
        path: '/assessment-results/:id',
        name: 'assessment-results-overview',
        component: DocumentOverviewTab,
      },
      {
        path: '/assessment-results/:id/edit',
        name: 'assessment-results-edit',
        component: Stub,
      },
    ],
  });
  await router.push('/assessment-results/ar-1');
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(DocumentOverviewTab)),
    }),
    { global: { plugins: [router] } },
  );
  await flushPromises();
  return { wrapper, router };
}

describe('DocumentOverviewTab', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    api.delete.mockReset().mockResolvedValue({});
  });

  it('shows assessment results’ details, imported plan and real result count', async () => {
    const { wrapper } = await mountTab();
    const text = wrapper.text();
    expect(text).toContain('IFA GoodRead AR');
    expect(text).toContain('./ap.oscal.xml');
    expect(text).toContain('Imported plan');
    expect(text).toMatch(/Results\s*1/i);
    expect(
      wrapper.find('a[href="/assessment-results/ar-1/edit"]').exists(),
    ).toBe(true);
  });

  it('deletes assessment results after confirmation and returns to the list', async () => {
    const { wrapper, router } = await mountTab();
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Delete'))!
      .trigger('click');
    wrapper.findComponent(ConfirmDialog).vm.$emit('confirm');
    await flushPromises();
    expect(api.delete).toHaveBeenCalledWith(
      '/api/oscal/assessment-results/ar-1',
    );
    expect(router.currentRoute.value.fullPath).toBe('/assessment-results');
  });
});
