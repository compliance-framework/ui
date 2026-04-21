import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
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
const isLoadingNotifications = ref(false);
const notificationsError = ref<unknown>(null);
const mockLoadNotifications = vi.fn().mockResolvedValue({});
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
    isLoadingNotifications.value = false;
    notificationsError.value = null;
    isCreatingDestination.value = false;
    isDeletingDestination.value = false;
  });

  it('loads configured destinations from the backend response', () => {
    const wrapper = mount(NotificationsView);

    expect(wrapper.text()).toContain('Slack');
    expect(wrapper.text()).toContain('ccf-slack-int');
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

    const addButtons = wrapper
      .findAll('button')
      .filter((button) => button.text() === 'Add Destination');

    expect(addButtons).toHaveLength(2);
    await addButtons[1].trigger('click');
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

    const addButtons = wrapper
      .findAll('button')
      .filter((button) => button.text() === 'Add Destination');

    expect(addButtons).toHaveLength(2);
    await addButtons[1].trigger('click');
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

    const addButtons = wrapper
      .findAll('button')
      .filter((button) => button.text() === 'Add Destination');

    expect(addButtons).toHaveLength(2);
    await addButtons[1].trigger('click');
    await flushPromises();

    expect(mockCreateDestination).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Enter a valid email address.');
  });

  it('disables Slack destination option when Slack integration is not configured', async () => {
    mockAuthenticatedGet.mockRejectedValueOnce({
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
});
