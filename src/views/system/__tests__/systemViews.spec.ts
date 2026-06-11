import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref, type Ref } from 'vue';
import UsersView from '@/views/system/UsersView.vue';
import ComponentsView from '@/views/system/ComponentsView.vue';
import AuthorizationsView from '@/views/system/AuthorizationsView.vue';

const {
  activePlan,
  apiPayloads,
  executeCalls,
  routerPush,
  toastAdd,
  loadInitialProfiles,
} = vi.hoisted(() => {
  return {
    activePlan: {
      uuid: 'ssp-1',
      metadata: {
        title: 'Active SSP',
        version: '1.0.0',
        lastModified: '2026-01-01T00:00:00Z',
      },
    },
    apiPayloads: new Map<string, unknown>(),
    executeCalls: [] as string[],
    routerPush: vi.fn(),
    toastAdd: vi.fn(),
    loadInitialProfiles: vi.fn(async () => undefined),
  };
});

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a><slot /></a>',
  },
  useRoute: () => ({ params: {} }),
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: toastAdd }),
}));

vi.mock('@/stores/system.ts', () => ({
  useSystemStore: () => ({
    system: {
      securityPlan: activePlan,
    },
  }),
}));

vi.mock('@/utils/delete-dialog', () => ({
  useDeleteConfirmationDialog: () => ({
    confirmDeleteDialog: vi.fn(),
  }),
}));

vi.mock('@/composables/useSspProfileBindings', () => ({
  useSspProfileBindings: () => ({
    selectedProfiles: ref(['profile-1']),
    profileSaveInProgress: ref(false),
    loadInitialProfiles,
  }),
}));

vi.mock('@/composables/axios', () => {
  const makeResponse = (payload: unknown) => ({
    data: {
      value: {
        data: payload,
      },
    },
  });

  return {
    decamelizeKeys: (data: unknown) => data,
    useDataApi: (
      initialUrl?: string | Ref<string | null> | null,
      _config?: unknown,
      options?: { initialData?: unknown },
    ) => {
      const initialEndpoint =
        typeof initialUrl === 'string' ? initialUrl : undefined;
      const data = ref(
        initialEndpoint && apiPayloads.has(initialEndpoint)
          ? apiPayloads.get(initialEndpoint)
          : options?.initialData,
      );
      const isLoading = ref(false);

      const execute = vi.fn(async (nextUrl?: string) => {
        const endpoint =
          typeof nextUrl === 'string' ? nextUrl : (initialEndpoint ?? '');
        executeCalls.push(endpoint);
        const payload = apiPayloads.has(endpoint)
          ? apiPayloads.get(endpoint)
          : null;
        data.value = payload;
        return makeResponse(payload);
      });

      return {
        data,
        isLoading,
        error: ref(null),
        execute,
      };
    },
  };
});

const endpoint = {
  users: '/api/oscal/system-security-plans/ssp-1/system-implementation/users',
  components:
    '/api/oscal/system-security-plans/ssp-1/system-implementation/components',
  authorizations:
    '/api/oscal/system-security-plans/ssp-1/system-implementation/leveraged-authorizations',
  inventory:
    '/api/oscal/system-security-plans/ssp-1/system-implementation/inventory-items',
  characteristics:
    '/api/oscal/system-security-plans/ssp-1/system-characteristics',
  profiles: '/api/oscal/profiles',
};

const stubs = {
  Dialog: { template: '<div><slot /></div>' },
  Drawer: { template: '<div><slot /></div>' },
  Panel: { template: '<section><slot name="header" /><slot /></section>' },
  PrimaryButton: { template: '<button><slot /></button>' },
  TertiaryButton: { template: '<button><slot /></button>' },
  TooltipTitle: {
    props: ['text'],
    template: '<h3>{{ text }}</h3>',
  },
  MultiSelect: { template: '<div />' },
  RouterLinkButton: {
    props: ['to'],
    template: '<a><slot /></a>',
  },
  RiskOverviewSection: { template: '<div />' },
  Diagrams: { template: '<div />' },
  ComponentRisksList: { template: '<div />' },
  ComponentDashboardsView: { template: '<div />' },
  SystemImplementationUserCreateForm: { template: '<div />' },
  SystemImplementationUserEditForm: { template: '<div />' },
  SystemImplementationComponentCreateForm: { template: '<div />' },
  SystemImplementationComponentEditForm: { template: '<div />' },
  SystemImplementationLeveragedAuthorizationCreateForm: {
    template: '<div />',
  },
  SystemImplementationLeveragedAuthorizationEditForm: {
    template: '<div />',
  },
};

describe('System area views', () => {
  beforeEach(() => {
    apiPayloads.clear();
    executeCalls.length = 0;
    routerPush.mockReset();
    toastAdd.mockReset();
    loadInitialProfiles.mockClear();
  });

  it.each([null, []])(
    'renders the users empty state when the API returns %s',
    async (payload) => {
      apiPayloads.set(endpoint.users, payload);

      const wrapper = mount(UsersView, {
        global: { stubs },
      });
      await flushPromises();

      expect(wrapper.text()).toContain(
        'No users defined. Create your first user to get started.',
      );
    },
  );

  it.each([null, []])(
    'renders the components empty state when the API returns %s',
    async (payload) => {
      apiPayloads.set(endpoint.components, payload);
      apiPayloads.set('/api/oscal/system-security-plans/ssp-1/risks', []);
      apiPayloads.set(endpoint.users, []);

      const wrapper = mount(ComponentsView, {
        global: { stubs },
      });
      await flushPromises();

      expect(wrapper.text()).toContain(
        'No components defined. Create your first component to get started.',
      );
    },
  );

  it.each([null, []])(
    'renders the leveraged authorizations empty state when the API returns %s',
    async (payload) => {
      apiPayloads.set(endpoint.authorizations, payload);

      const wrapper = mount(AuthorizationsView, {
        global: { stubs },
      });
      await flushPromises();

      expect(wrapper.text()).toContain(
        'No leveraged authorizations defined. Create your first authorization to get started.',
      );
    },
  );

});
