import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref, shallowRef, type Ref } from 'vue';
import UsersView from '@/views/system/UsersView.vue';
import ComponentsView from '@/views/system/ComponentsView.vue';
import AuthorizationsView from '@/views/system/AuthorizationsView.vue';
import DiagramsView from '@/views/system/DiagramsView.vue';

const {
  activePlan,
  apiPayloads,
  apiErrors,
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
    apiErrors: new Map<string, unknown>(),
    executeCalls: [] as Array<{
      endpoint: string;
      config?: { data?: unknown };
    }>,
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
      const data = shallowRef(
        initialEndpoint && apiPayloads.has(initialEndpoint)
          ? apiPayloads.get(initialEndpoint)
          : options?.initialData,
      );
      const isLoading = ref(false);

      const execute = vi.fn(async (nextUrl?: string, nextConfig?: unknown) => {
        const endpoint =
          typeof nextUrl === 'string' ? nextUrl : (initialEndpoint ?? '');
        executeCalls.push({
          endpoint,
          config: nextConfig as { data?: unknown } | undefined,
        });
        if (apiErrors.has(endpoint)) {
          throw apiErrors.get(endpoint);
        }
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
  authorizationBoundary:
    '/api/oscal/system-security-plans/ssp-1/system-characteristics/authorization-boundary',
  networkArchitecture:
    '/api/oscal/system-security-plans/ssp-1/system-characteristics/network-architecture',
  dataFlow:
    '/api/oscal/system-security-plans/ssp-1/system-characteristics/data-flow',
};

const stubs = {
  Dialog: { template: '<div><slot /></div>' },
  Drawer: { template: '<div><slot /></div>' },
  Panel: { template: '<section><slot name="header" /><slot /></section>' },
  PrimaryButton: { template: '<button><slot /></button>' },
  TertiaryButton: { template: '<button><slot /></button>' },
  InputText: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  CollapsableGroup: {
    template: '<section><slot name="header" /><slot /></section>',
  },
  DrawIODiagramEditor: {
    props: ['diagram'],
    template:
      '<div class="drawio-editor" :data-diagram-uuid="diagram.uuid">DrawIO {{ diagram.uuid }}</div>',
  },
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
    apiErrors.clear();
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

  it('renders a diagram immediately after adding to a grouping reset by a 404', async () => {
    apiErrors.set(endpoint.networkArchitecture, { response: { status: 404 } });
    apiPayloads.set(endpoint.authorizationBoundary, { diagrams: [] });
    apiPayloads.set(endpoint.dataFlow, { diagrams: [] });
    apiPayloads.set(`${endpoint.networkArchitecture}/diagrams`, {
      uuid: 'diagram-created',
      caption: 'Created diagram',
      description: '',
      props: [],
      links: [],
    });

    const wrapper = mount(DiagramsView, {
      global: { stubs },
    });
    await flushPromises();

    await wrapper
      .findAll('button')
      .filter((button) => button.text() === 'Add Diagram')[1]
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Created diagram');
    expect(wrapper.find('[data-diagram-uuid="diagram-created"]').exists()).toBe(
      true,
    );
  });

  it('renders diagram captions, fallback titles, and descriptions', async () => {
    apiPayloads.set(endpoint.authorizationBoundary, {
      diagrams: [
        {
          uuid: 'diagram-titled',
          caption: 'Boundary overview',
          description: 'Primary boundary diagram',
          props: [],
          links: [],
        },
        {
          uuid: 'diagram-untitled',
          caption: '',
          description: '',
          props: [],
          links: [],
        },
      ],
    });
    apiPayloads.set(endpoint.networkArchitecture, { diagrams: [] });
    apiPayloads.set(endpoint.dataFlow, { diagrams: [] });

    const wrapper = mount(DiagramsView, {
      global: { stubs },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Boundary overview');
    expect(wrapper.text()).toContain('Primary boundary diagram');
    expect(wrapper.text()).toContain('Untitled diagram');
  });

  it('edits a caption while preserving diagram props in the PUT body', async () => {
    const props = [
      { ns: 'ccf', name: 'ccf-diagram-xml', value: '<mxfile />' },
      { ns: 'ccf', name: 'ccf-diagram-png', value: 'data:image/png;base64,x' },
    ];
    apiPayloads.set(endpoint.authorizationBoundary, {
      diagrams: [
        {
          uuid: 'diagram-edit',
          caption: 'Old caption',
          description: '',
          props,
          links: [],
        },
      ],
    });
    apiPayloads.set(endpoint.networkArchitecture, { diagrams: [] });
    apiPayloads.set(endpoint.dataFlow, { diagrams: [] });

    const wrapper = mount(DiagramsView, {
      global: { stubs },
    });
    await flushPromises();

    await wrapper
      .find('button[aria-label="Edit diagram title"]')
      .trigger('click');
    await wrapper.find('input').setValue('New caption');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Save')
      ?.trigger('click');
    await flushPromises();

    const putCall = executeCalls.find((call) =>
      call.endpoint.endsWith('/authorization-boundary/diagrams/diagram-edit'),
    );
    expect(putCall?.config?.data).toMatchObject({
      uuid: 'diagram-edit',
      caption: 'New caption',
      props,
    });
    expect(wrapper.text()).toContain('New caption');
  });

  it('collapses a diagram with v-show without removing the editor', async () => {
    apiPayloads.set(endpoint.authorizationBoundary, {
      diagrams: [
        {
          uuid: 'diagram-collapse',
          caption: 'Collapsible diagram',
          description: '',
          props: [],
          links: [],
        },
      ],
    });
    apiPayloads.set(endpoint.networkArchitecture, { diagrams: [] });
    apiPayloads.set(endpoint.dataFlow, { diagrams: [] });

    const wrapper = mount(DiagramsView, {
      global: { stubs },
    });
    await flushPromises();

    const editor = wrapper.find('[data-diagram-uuid="diagram-collapse"]');
    expect(editor.exists()).toBe(true);
    expect(editor.isVisible()).toBe(true);

    await wrapper
      .findAll('span')
      .find((span) => span.text() === 'Collapsible diagram')
      ?.trigger('click');
    await flushPromises();

    expect(editor.exists()).toBe(true);
    expect(editor.attributes('style')).toContain('display: none');
  });
});
