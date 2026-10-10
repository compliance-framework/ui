import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref, shallowRef } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import PrimeVue from 'primevue/config';
import SystemSecurityPlanControlImplementationView from '../SystemSecurityPlanControlImplementationView.vue';

enableAutoUnmount(afterEach);

const requested: string[] = [];

vi.mock('@/composables/axios', () => ({
  useDataApi: vi.fn(() => {
    const data = shallowRef<unknown>();
    const execute = vi.fn(async (url?: string) => {
      if (!url) return;
      requested.push(url);
      if (url.endsWith('/control-implementation')) {
        data.value = {
          uuid: 'ci-1',
          description: 'Narrative',
          setParameters: [],
          implementedRequirements: [
            {
              uuid: 'req-1',
              controlId: 'ac-1',
              statements: [
                {
                  uuid: 'stmt-1',
                  statementId: 'ac-1_smt',
                  byComponents: [
                    {
                      uuid: 'stmt-bc-1',
                      componentUuid: 'comp-1',
                      description: 'Statement-level row',
                    },
                  ],
                },
              ],
              byComponents: [
                {
                  uuid: 'legacy-1',
                  componentUuid: 'comp-1',
                  description: 'Legacy requirement-level row',
                },
              ],
            },
          ],
        };
      } else if (url.endsWith('/components')) {
        data.value = [];
      }
    });
    return { data, error: ref(null), isLoading: ref(false), execute };
  }),
}));

const canMock = vi.fn<(...args: unknown[]) => boolean>(() => true);
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: (...args: unknown[]) => canMock(...args),
    permissionTooltip: () => 'no permission',
  }),
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
  const tab = wrapper
    .findAll('button')
    .find((button) => button.text().startsWith('REQ COMPONENTS'))!;
  await tab.trigger('click');
  return wrapper;
}

// The legacy row's own card; the page has other EDIT/DELETE buttons.
function legacyRow(wrapper: Awaited<ReturnType<typeof mountView>>) {
  return wrapper
    .findAll('article')
    .find((article) =>
      article.text().includes('Legacy requirement-level row'),
    )!;
}

describe('statement-level component delete (SSP control implementation)', () => {
  it('removes the row from the page after deleting', async () => {
    const wrapper = await mountView();
    const statementsTab = wrapper
      .findAll('button')
      .find((button) => button.text().startsWith('STATEMENTS'))!;
    await statementsTab.trigger('click');
    const row = () =>
      wrapper
        .findAll('article')
        .find((article) => article.text().includes('Statement-level row'));
    expect(row()).toBeDefined();

    const remove = row()!
      .findAll('button')
      .find((button) => /^(DELETE|REMOVE)$/.test(button.text()));
    expect(remove).toBeDefined();
    await remove!.trigger('click');
    await flushPromises();

    expect(requested).toContain(
      '/api/oscal/system-security-plans/ssp-a/control-implementation/implemented-requirements/req-1/statements/stmt-1/by-components/stmt-bc-1',
    );
    expect(row()).toBeUndefined();
  });
});

describe('legacy requirement-level components (SSP control implementation)', () => {
  it('are read-only with a legacy note and no edit action', async () => {
    const wrapper = await mountView();

    expect(wrapper.text()).toContain('Legacy requirement-level row');
    expect(wrapper.text()).toContain('legacy and read-only');
    const labels = legacyRow(wrapper)
      .findAll('button')
      .map((button) => button.text());
    expect(labels).toContain('DELETE');
    expect(labels).not.toContain('EDIT');
  });

  it('disables delete without ssp:delete', async () => {
    canMock.mockReturnValue(false);
    const wrapper = await mountView();
    const remove = legacyRow(wrapper)
      .findAll('button')
      .find((button) => button.text() === 'DELETE')!;

    expect(remove.attributes('disabled')).toBeDefined();
    expect(canMock).toHaveBeenCalledWith('ssp', 'delete');
    canMock.mockReturnValue(true);
  });

  it('delete the row through the requirement-level endpoint', async () => {
    const wrapper = await mountView();
    const remove = legacyRow(wrapper)
      .findAll('button')
      .find((button) => button.text() === 'DELETE')!;
    await remove.trigger('click');
    await flushPromises();

    expect(requested).toContain(
      '/api/oscal/system-security-plans/ssp-a/control-implementation/implemented-requirements/req-1/by-components/legacy-1',
    );
    expect(wrapper.text()).not.toContain('Legacy requirement-level row');
  });
});
