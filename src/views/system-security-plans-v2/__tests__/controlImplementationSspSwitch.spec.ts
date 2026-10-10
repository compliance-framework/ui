import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, KeepAlive, ref, shallowRef } from 'vue';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import PrimeVue from 'primevue/config';
import SystemSecurityPlanControlImplementationView from '../SystemSecurityPlanControlImplementationView.vue';

enableAutoUnmount(afterEach);

// Every GET the view issues, by URL. Each URL answers with SSP-specific data.
const fetched: string[] = [];

vi.mock('@/composables/axios', () => ({
  // Like the real composable, a URL with default options fetches immediately.
  useDataApi: vi.fn(
    (
      initialUrl?: string | null,
      _config?: unknown,
      options?: { immediate?: boolean },
    ) => {
      const data = shallowRef<unknown>();
      const execute = vi.fn(async (url?: string) => {
        if (!url) return;
        fetched.push(url);
        data.value = url.endsWith('/control-implementation')
          ? {
              uuid: `ci-${url}`,
              description: '',
              setParameters: [],
              implementedRequirements: [
                { uuid: `req-for-${url.split('/')[4]}`, controlId: 'ac-1' },
              ],
            }
          : [];
      });
      if (initialUrl && options?.immediate !== false) {
        void execute(initialUrl);
      }
      return { data, error: ref(null), isLoading: ref(false), execute };
    },
  ),
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
vi.mock('@/utils/delete-dialog', () => ({
  useDeleteConfirmationDialog: () => ({ confirmDeleteDialog: vi.fn() }),
}));

const Host = defineComponent({
  // Mirrors SystemSecurityPlanEditorView, which keeps tabs alive across SSPs.
  render: () =>
    h(RouterView, null, {
      default: ({ Component }: { Component: unknown }) =>
        h(KeepAlive, null, [Component ? h(Component as never) : null]),
    }),
});

describe('SSP control implementation under KeepAlive', () => {
  it('refetches for the new SSP instead of keeping the first one', async () => {
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

    expect(fetched).toContain(
      '/api/oscal/system-security-plans/ssp-a/control-implementation',
    );

    await router.push('/system-security-plans/ssp-b/control-implementation');
    await flushPromises();

    expect(fetched).toContain(
      '/api/oscal/system-security-plans/ssp-b/control-implementation',
    );
    expect(fetched).toContain(
      '/api/oscal/system-security-plans/ssp-b/system-implementation/components',
    );
    wrapper.unmount();
  });

  it('shows an empty state instead of placeholder copy for a missing description', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/system-security-plans/:id/control-implementation',
          component: SystemSecurityPlanControlImplementationView,
        },
      ],
    });
    await router.push('/system-security-plans/ssp-c/control-implementation');
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

    expect(wrapper.text()).toContain('No description provided.');
    expect(wrapper.text()).not.toContain('implementation narrative');
  });
});
