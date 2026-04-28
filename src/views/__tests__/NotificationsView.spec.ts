import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { ref, shallowRef } from 'vue';

const createDestinationExecuteResult = (destination: {
  providerType: 'slack' | 'email';
  destinationTarget: string;
}) => ({
  data: ref({
    data: destination,
  }),
});

const notificationConfigurations = shallowRef([
  {
    name: 'EVIDENCE_DIGEST',
    configuredDestinations: [
      {
        providerType: 'slack',
        destinationTarget: 'ccf-slack-int',
      },
    ],
  },
]);
const notificationProviders = shallowRef([
  {
    providerType: 'email',
    displayName: 'Email',
    description: 'Configured SMTP provider for email service',
    enabled: true,
    metadata: {
      serviceProviderName: 'SMTP',
      serviceProviderType: 'smtp',
    },
  },
  {
    providerType: 'slack',
    displayName: 'Slack',
    description: 'Configured Slack workspace',
    enabled: true,
    metadata: {
      botId: 'B0ANWHKQMCP',
      teamId: 'T0AP4C0TA7M',
      workspaceName: 'reece-sandbox',
      workspaceUrl: 'https://reece-sandbox.slack.com/',
    },
  },
]);
const isLoadingNotifications = ref(false);
const notificationsError = ref<unknown>(null);
const isLoadingProviders = ref(false);
const providersError = ref<unknown>(null);
const mockLoadNotifications = vi.fn().mockResolvedValue({});
const mockLoadProviders = vi.fn().mockResolvedValue({});
const mockCreateDestination = vi.fn().mockResolvedValue(
  createDestinationExecuteResult({
    providerType: 'email',
    destinationTarget: 'alerts@example.com',
  }),
);
const mockDeleteDestination = vi.fn().mockResolvedValue({});
const mockAuthenticatedGet = vi.fn().mockResolvedValue({
  data: {
    data: {
      linked: false,
    },
  },
});
const isCreatingDestination = ref(false);
const isDeletingDestination = ref(false);
const toastAdd = vi.fn();

function getLastButtonByText(wrapper: VueWrapper, text: string) {
  const buttons = wrapper
    .findAll('button')
    .filter((button) => button.text() === text);
  const button = buttons[buttons.length - 1];

  expect(button).toBeDefined();

  return button!;
}

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({
    get: mockAuthenticatedGet,
  }),
  useDataApi: (
    url?: string | null,
    config?: {
      method?: string;
    },
  ) => {
    if (url === '/api/admin/notifications') {
      return {
        data: notificationConfigurations,
        isLoading: isLoadingNotifications,
        error: notificationsError,
        execute: mockLoadNotifications,
      };
    }

    if (url === '/api/admin/notifications/providers') {
      return {
        data: notificationProviders,
        isLoading: isLoadingProviders,
        error: providersError,
        execute: mockLoadProviders,
      };
    }

    if (url === null && config?.method === 'POST') {
      return {
        execute: mockCreateDestination,
        isLoading: isCreatingDestination,
      };
    }

    if (url === null && config?.method === 'DELETE') {
      return {
        execute: mockDeleteDestination,
        isLoading: isDeletingDestination,
      };
    }

    throw new Error(`Unexpected useDataApi call: ${url}`);
  },
  decamelizeKeys: vi.fn((data: unknown) => JSON.stringify(data)),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: toastAdd,
    remove: vi.fn(),
  }),
}));

vi.mock('@/components/PageHeader.vue', () => ({
  default: {
    name: 'PageHeader',
    template: '<h1><slot /></h1>',
  },
}));

vi.mock('@/components/PageCard.vue', () => ({
  default: {
    name: 'PageCard',
    template: '<div><slot /></div>',
  },
}));

vi.mock('@/volt/Dialog.vue', () => ({
  default: {
    name: 'Dialog',
    props: ['visible', 'modal', 'header', 'size'],
    emits: ['update:visible', 'hide'],
    template: '<div v-if="visible"><slot /><slot name="footer" /></div>',
  },
}));

import NotificationsView from '../admin/NotificationsView.vue';

describe('NotificationsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateDestination.mockResolvedValue(
      createDestinationExecuteResult({
        providerType: 'email',
        destinationTarget: 'alerts@example.com',
      }),
    );
    mockDeleteDestination.mockResolvedValue({});
    mockAuthenticatedGet.mockResolvedValue({
      data: {
        data: {
          linked: false,
        },
      },
    });
    notificationConfigurations.value = [
      {
        name: 'EVIDENCE_DIGEST',
        configuredDestinations: [
          {
            providerType: 'slack',
            destinationTarget: 'ccf-slack-int',
          },
        ],
      },
    ];
    notificationProviders.value = [
      {
        providerType: 'email',
        displayName: 'Email',
        description: 'Configured SMTP provider for email service',
        enabled: true,
        metadata: {
          serviceProviderName: 'SMTP',
          serviceProviderType: 'smtp',
        },
      },
      {
        providerType: 'slack',
        displayName: 'Slack',
        description: 'Configured Slack workspace',
        enabled: true,
        metadata: {
          botId: 'B0ANWHKQMCP',
          teamId: 'T0AP4C0TA7M',
          workspaceName: 'reece-sandbox',
          workspaceUrl: 'https://reece-sandbox.slack.com/',
        },
      },
    ];
    isLoadingNotifications.value = false;
    notificationsError.value = null;
    isLoadingProviders.value = false;
    providersError.value = null;
    isCreatingDestination.value = false;
    isDeletingDestination.value = false;
  });

  it('loads provider information from the backend response', () => {
    const wrapper = mount(NotificationsView);

    expect(wrapper.text()).toContain('Providers');
    expect(wrapper.text()).toContain('email');
    expect(wrapper.text()).toContain(
      'Configured SMTP provider for email service',
    );
    expect(wrapper.text()).toContain('Service Provider Name: SMTP');
    expect(wrapper.text()).toContain('Service Provider Type: smtp');
    expect(wrapper.text()).toContain('Bot Id: B0ANWHKQMCP');
    expect(wrapper.text()).toContain('Team Id: T0AP4C0TA7M');
    expect(wrapper.text()).toContain('Workspace Name: reece-sandbox');
    expect(wrapper.text()).toContain(
      'Workspace Url: https://reece-sandbox.slack.com/',
    );
    expect(wrapper.text()).toContain('Enabled');
  });

  it('loads configured destinations from the backend response', () => {
    const wrapper = mount(NotificationsView);

    expect(wrapper.text()).toContain('Slack');
    expect(wrapper.text()).toContain('ccf-slack-int');
  });

  it('loads workflow execution failure destinations from the backend response', () => {
    notificationConfigurations.value = [
      {
        name: 'EVIDENCE_DIGEST',
        configuredDestinations: [],
      },
      {
        name: 'WORKFLOW_EXECUTION_FAILED',
        configuredDestinations: [
          {
            providerType: 'slack',
            destinationTarget: 'ccf-slack-int',
          },
          {
            providerType: 'slack',
            destinationTarget: 'ccf-slack-int-pub',
          },
        ],
      },
    ];

    const wrapper = mount(NotificationsView);

    expect(wrapper.text()).toContain('Workflow Instance Failure');
    expect(wrapper.text()).toContain('ccf-slack-int');
    expect(wrapper.text()).toContain('ccf-slack-int-pub');
  });

  it('posts a new email destination to the notification destinations endpoint', async () => {
    const wrapper = mount(NotificationsView);

    const openDialogButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add Destination');

    expect(openDialogButton).toBeDefined();
    await openDialogButton!.trigger('click');

    await wrapper.get('#destination-provider').setValue('email');
    await wrapper.get('#destination-target').setValue('alerts@example.com');

    await getLastButtonByText(wrapper, 'Add Destination').trigger('click');
    await flushPromises();

    expect(mockCreateDestination).toHaveBeenCalledWith(
      '/api/admin/notifications/EVIDENCE_DIGEST/destinations',
      {
        data: {
          providerType: 'email',
          destinationTarget: 'alerts@example.com',
        },
      },
    );

    expect(notificationConfigurations.value[0].configuredDestinations).toEqual([
      {
        providerType: 'slack',
        destinationTarget: 'ccf-slack-int',
      },
      {
        providerType: 'email',
        destinationTarget: 'alerts@example.com',
      },
    ]);

    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Destination Added',
      }),
    );
    expect(wrapper.text()).toContain('alerts@example.com');
  });

  it('shows the backend duplicate message when destination creation returns 409', async () => {
    mockCreateDestination.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          errors: {
            body: 'That destination is already configured for this notification.',
          },
        },
      },
    });

    const wrapper = mount(NotificationsView);

    const openDialogButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add Destination');

    expect(openDialogButton).toBeDefined();
    await openDialogButton!.trigger('click');

    await wrapper.get('#destination-provider').setValue('email');
    await wrapper.get('#destination-target').setValue('alerts@example.com');

    await getLastButtonByText(wrapper, 'Add Destination').trigger('click');
    await flushPromises();

    expect(mockCreateDestination).toHaveBeenCalledWith(
      '/api/admin/notifications/EVIDENCE_DIGEST/destinations',
      {
        data: {
          providerType: 'email',
          destinationTarget: 'alerts@example.com',
        },
      },
    );
    expect(wrapper.text()).toContain(
      'That destination is already configured for this notification.',
    );
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Add Destination Failed',
      }),
    );
    expect(wrapper.text()).not.toContain('alerts@example.com');
  });

  it('shows non-Axios error messages when destination creation fails', async () => {
    mockCreateDestination.mockRejectedValueOnce(
      new Error('Network connection lost.'),
    );

    const wrapper = mount(NotificationsView);

    const openDialogButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add Destination');

    expect(openDialogButton).toBeDefined();
    await openDialogButton!.trigger('click');

    await wrapper.get('#destination-provider').setValue('email');
    await wrapper.get('#destination-target').setValue('alerts@example.com');

    await getLastButtonByText(wrapper, 'Add Destination').trigger('click');
    await flushPromises();

    expect(mockCreateDestination).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Network connection lost.');
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Add Destination Failed',
        detail: 'Network connection lost.',
      }),
    );
  });

  it('deletes a configured destination via the notification destinations endpoint', async () => {
    const wrapper = mount(NotificationsView);

    const removeButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Remove');

    expect(removeButton).toBeDefined();
    await removeButton!.trigger('click');
    await flushPromises();

    expect(mockDeleteDestination).toHaveBeenCalledWith(
      '/api/admin/notifications/EVIDENCE_DIGEST/destinations',
      {
        data: {
          providerType: 'slack',
          destinationTarget: 'ccf-slack-int',
        },
      },
    );
    expect(notificationConfigurations.value[0].configuredDestinations).toEqual(
      [],
    );
    expect(wrapper.text()).toContain('No destinations configured yet.');
    expect(wrapper.text()).not.toContain('ccf-slack-int');
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Destination Removed',
      }),
    );
  });

  it('shows the backend not-found message when destination removal returns 404', async () => {
    mockDeleteDestination.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 404,
        data: {
          errors: {
            body: 'configured notification destination not found',
          },
        },
      },
    });

    const wrapper = mount(NotificationsView);

    const removeButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Remove');

    expect(removeButton).toBeDefined();
    await removeButton!.trigger('click');
    await flushPromises();

    expect(mockDeleteDestination).toHaveBeenCalledWith(
      '/api/admin/notifications/EVIDENCE_DIGEST/destinations',
      {
        data: {
          providerType: 'slack',
          destinationTarget: 'ccf-slack-int',
        },
      },
    );
    expect(notificationConfigurations.value[0].configuredDestinations).toEqual([
      {
        providerType: 'slack',
        destinationTarget: 'ccf-slack-int',
      },
    ]);
    expect(wrapper.text()).toContain('ccf-slack-int');
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Remove Destination Failed',
        detail: 'configured notification destination not found',
      }),
    );
  });

  it('blocks the request when email validation fails', async () => {
    const wrapper = mount(NotificationsView);

    const openDialogButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add Destination');

    expect(openDialogButton).toBeDefined();
    await openDialogButton!.trigger('click');

    await wrapper.get('#destination-provider').setValue('email');
    await wrapper.get('#destination-target').setValue('not-an-email');

    await getLastButtonByText(wrapper, 'Add Destination').trigger('click');
    await flushPromises();

    expect(mockCreateDestination).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Enter a valid email address.');
  });

  it('disables Slack destination option when Slack integration is not configured', async () => {
    mockAuthenticatedGet.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 404,
      },
    });

    const wrapper = mount(NotificationsView);
    await flushPromises();

    const openDialogButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add Destination');

    expect(openDialogButton).toBeDefined();
    await openDialogButton!.trigger('click');

    const providerSelect = wrapper.get('#destination-provider');
    const slackOption = providerSelect.find('option[value="slack"]');
    const emailOption = providerSelect.find('option[value="email"]');

    expect(slackOption.attributes('disabled')).toBeDefined();
    expect(emailOption.attributes('disabled')).toBeUndefined();
    expect((providerSelect.element as HTMLSelectElement).value).toBe('email');
    expect(wrapper.text()).toContain(
      'Slack destinations are unavailable because Slack integration is not configured for this environment.',
    );
  });

  it('disables Slack destination option and shows feedback when Slack status loading fails', async () => {
    mockAuthenticatedGet.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          errors: {
            body: 'Slack status service is unavailable.',
          },
        },
      },
    });

    const wrapper = mount(NotificationsView);
    await flushPromises();

    const openDialogButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add Destination');

    expect(openDialogButton).toBeDefined();
    await openDialogButton!.trigger('click');

    const providerSelect = wrapper.get('#destination-provider');
    const slackOption = providerSelect.find('option[value="slack"]');
    const emailOption = providerSelect.find('option[value="email"]');

    expect(slackOption.attributes('disabled')).toBeDefined();
    expect(emailOption.attributes('disabled')).toBeUndefined();
    expect((providerSelect.element as HTMLSelectElement).value).toBe('email');
    expect(wrapper.text()).toContain(
      'Slack destinations are unavailable because Slack status could not be loaded: Slack status service is unavailable.',
    );
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Slack Status Unavailable',
        detail: 'Slack status service is unavailable.',
      }),
    );
  });

  it('disables Slack destination option when the backend reports Slack disabled', async () => {
    notificationProviders.value = notificationProviders.value.map((provider) =>
      provider.providerType === 'slack'
        ? {
            ...provider,
            enabled: false,
          }
        : provider,
    );

    const wrapper = mount(NotificationsView);
    await flushPromises();

    const openDialogButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add Destination');

    expect(openDialogButton).toBeDefined();
    await openDialogButton!.trigger('click');

    const providerSelect = wrapper.get('#destination-provider');
    const slackOption = providerSelect.find('option[value="slack"]');
    const emailOption = providerSelect.find('option[value="email"]');

    expect(slackOption.attributes('disabled')).toBeDefined();
    expect(emailOption.attributes('disabled')).toBeUndefined();
    expect((providerSelect.element as HTMLSelectElement).value).toBe('email');
    expect(wrapper.text()).toContain(
      'Slack destinations are unavailable because Slack notifications are disabled for this environment.',
    );
  });

  it('blocks creating a destination when the backend reports the selected provider disabled', async () => {
    notificationProviders.value = notificationProviders.value.map((provider) =>
      provider.providerType === 'email'
        ? {
            ...provider,
            enabled: false,
          }
        : provider,
    );

    const wrapper = mount(NotificationsView);
    await flushPromises();

    const openDialogButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add Destination');

    expect(openDialogButton).toBeDefined();
    await openDialogButton!.trigger('click');

    const providerSelect = wrapper.get('#destination-provider');
    const slackOption = providerSelect.find('option[value="slack"]');
    const emailOption = providerSelect.find('option[value="email"]');

    expect(slackOption.attributes('disabled')).toBeUndefined();
    expect(emailOption.attributes('disabled')).toBeDefined();
    expect((providerSelect.element as HTMLSelectElement).value).toBe('slack');

    await providerSelect.setValue('email');
    await wrapper.get('#destination-target').setValue('alerts@example.com');

    await getLastButtonByText(wrapper, 'Add Destination').trigger('click');
    await flushPromises();

    expect(mockCreateDestination).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain(
      'Email destinations are unavailable because email notifications are disabled for this environment.',
    );
  });
});
