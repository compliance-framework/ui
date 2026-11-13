import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import ControlEvidenceScreen from '../ControlEvidenceScreen.vue';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get }),
}));

async function mountScreen() {
  const Stub = { render: () => null };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/catalogs/:id', name: 'catalog-view', component: Stub },
      {
        path: '/catalogs/:catalog/control/:id/evidence',
        component: ControlEvidenceScreen,
      },
      { path: '/evidence/:evidenceId', name: 'evidence:view', component: Stub },
    ],
  });
  await router.push('/catalogs/cat-1/control/ac-2/evidence');
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(ControlEvidenceScreen)),
    }),
    { global: { plugins: [router] } },
  );
  await flushPromises();
  return wrapper;
}

describe('ControlEvidenceScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    get.mockReset();
  });

  it('lists the control’s evidence, linking each record, even without labels', async () => {
    get.mockResolvedValue({
      data: {
        // for-control returns `labels: null`, which crashed the classic page.
        data: [
          {
            id: 'e1',
            title: 'MFA enforced',
            labels: null,
            status: { state: 'satisfied' },
            end: '2026-11-01T00:00:00Z',
          },
        ],
        metadata: { control: { id: 'ac-2', title: 'Account management' } },
      },
    });
    const wrapper = await mountScreen();
    expect(get).toHaveBeenCalledWith('/api/evidence/for-control/ac-2');
    expect(wrapper.find('h1').text()).toBe('Evidence for ac-2');
    expect(wrapper.text()).toContain('Account management');
    expect(wrapper.find('tbody a').attributes('href')).toBe('/evidence/e1');
    expect(wrapper.find('tbody').text()).toContain('Satisfied');
  });

  it('says when the control has no evidence', async () => {
    get.mockResolvedValue({
      data: { data: null, metadata: { control: { id: 'ac-2', title: 'x' } } },
    });
    const wrapper = await mountScreen();
    expect(wrapper.text()).toContain('No evidence for this control yet');
  });
});
