import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref, shallowRef } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import PrimeVue from 'primevue/config';
import SystemSecurityPlanControlImplementationView from '../SystemSecurityPlanControlImplementationView.vue';

enableAutoUnmount(afterEach);

vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(() => {
    const data = shallowRef<unknown>();
    const execute = vi.fn(async (url?: string) => {
      if (!url) return;
      if (url.endsWith('/control-implementation')) {
        const req = (controlId: string, remarks = '') => ({
          uuid: `req-${controlId}`,
          controlId,
          remarks,
          statements: [],
          byComponents: [],
        });
        data.value = {
          uuid: 'ci-1',
          description: 'Narrative',
          setParameters: [],
          implementedRequirements: [
            req('si-4'),
            req('ac-10'),
            req('ac-2.1'),
            req('at-1', 'Awareness training owned by HR'),
            req('ac-2'),
          ],
        };
      } else if (url.endsWith('/components')) {
        data.value = [];
      }
    });
    return { data, error: ref(null), isLoading: ref(false), execute };
  }),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => true, permissionTooltip: () => '' }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));
// Confirm immediately so the delete runs.
vi.mock('@/utils/delete-dialog', () => ({
  useDeleteConfirmationDialog: () => ({
    confirmDeleteDialog: (onConfirm: () => void) => onConfirm(),
  }),
}));

const Host = defineComponent({ render: () => h(RouterView) });

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/system-security-plans/:id/control-implementation',
        component: SystemSecurityPlanControlImplementationView,
      },
    ],
  });
  await router.push('/system-security-plans/ssp-a/control-implementation');
  const wrapper = mount(Host, {
    global: {
      plugins: [router, [PrimeVue, { unstyled: true }]],
      stubs: {
        ControlImplementationModalForm: true,
        ImplementedRequirementModalForm: true,
        StatementModalForm: true,
        ByComponentModalForm: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
}

// Control IDs in the requirement list, in rendered order.
function listedControlIds(wrapper: Awaited<ReturnType<typeof mountView>>) {
  return wrapper
    .findAll('.requirements-scroll > button')
    .map((button) => button.text().split(/\s+/)[0]);
}

describe('SSP control implementation requirement list', () => {
  it('lists requirements in natural control-ID order', async () => {
    const wrapper = await mountView();

    expect(listedControlIds(wrapper)).toEqual([
      'ac-2',
      'ac-2.1',
      'ac-10',
      'at-1',
      'si-4',
    ]);
  });

  it('filters by control ID or remarks and shows the match count', async () => {
    const wrapper = await mountView();
    const search = wrapper.find('input[type="search"]');

    await search.setValue('AC-2');
    expect(listedControlIds(wrapper)).toEqual(['ac-2', 'ac-2.1']);
    expect(wrapper.text()).toContain('2 / 5');

    await search.setValue('training');
    expect(listedControlIds(wrapper)).toEqual(['at-1']);

    await search.setValue('zz-99');
    expect(listedControlIds(wrapper)).toEqual([]);
    expect(wrapper.text()).toContain('No requirements match "zz-99"');
  });
});
