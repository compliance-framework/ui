import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
const notificationHealth = shallowRef({
  worker: {
    enabled: true,
    mode: 'notify',
    pollOnly: false,
    queues: [
      {
        name: 'slack',
        maxWorkers: 5,
        available: 2,
        retryable: 1,
        running: 0,
        scheduled: 0,
        completed24h: 14,
        discarded24h: 1,
        oldestAvailableAt: '2026-05-21T00:01:00Z',
        staleCount: 1,
        staleThresholdSeconds: 600,
      },
      {
        name: 'email',
        maxWorkers: 2,
        available: 0,
        retryable: 0,
        running: 0,
        scheduled: 0,
        completed24h: 3,
        discarded24h: 0,
        oldestAvailableAt: null,
        staleCount: 0,
        staleThresholdSeconds: 600,
      },
    ],
  },
  providers: notificationProviders.value,
  notifications: [
    {
      name: 'EVIDENCE_DIGEST',
      configuredDestinations: [],
      subscriberCounts: {
        email: 12,
        slack: 8,
        totalUsers: 14,
      },
      warnings: [],
    },
  ],
  schedules: [
    {
      name: 'EVIDENCE_DIGEST',
      jobKind: 'send_global_digest',
      queue: 'digest',
      enabled: true,
      schedule: '@daily',
      nextRunAt: null,
      lastJob: {
        id: 241582,
        state: 'completed',
        createdAt: '2026-05-21T00:00:00Z',
        finalizedAt: '2026-05-21T00:00:01Z',
      },
    },
  ],
  warnings: [
    {
      code: 'slack_queue_backlog',
      severity: 'warning',
      message: 'Slack queue has jobs available for more than 10 minutes.',
      target: 'slack',
    },
  ],
});
const notificationJobs = shallowRef([
  {
    id: 241583,
    state: 'available',
    queue: 'slack',
    kind: 'send_channel',
    attempt: 0,
    maxAttempts: 5,
    createdAt: '2026-05-21T00:00:01Z',
    scheduledAt: '2026-05-21T00:00:01Z',
    attemptedAt: null,
    finalizedAt: null,
    notificationKind: 'evidence_digest',
    provider: 'slack',
    target: 'ccf-alerts',
    correlationId: 'evidence-digest:2026-05-21T00:00:01Z',
    sourceJobKind: 'send_global_digest',
    sourceJobId: '241582',
    lastError: null,
    stale: true,
  },
]);
const notificationJobDetail = shallowRef({
  id: 241583,
  state: 'discarded',
  queue: 'slack',
  kind: 'send_channel',
  attempt: 5,
  maxAttempts: 5,
  createdAt: '2026-05-21T00:00:01Z',
  scheduledAt: '2026-05-21T00:00:01Z',
  attemptedAt: '2026-05-21T00:04:10Z',
  finalizedAt: '2026-05-21T00:04:11Z',
  provider: 'slack',
  target: 'ccf-alerts',
  metadata: {
    notificationKind: 'evidence_digest',
    correlationId: 'evidence-digest:2026-05-21T00:00:01Z',
    sourceJobKind: 'send_global_digest',
    sourceJobId: '241582',
    secret: 'do-not-render',
  },
  args: {
    channel: 'ccf-alerts',
    targetType: 'channel',
    htmlBody: '<p>secret body</p>',
    blocks: [{ text: 'secret block' }],
  },
  errors: [
    {
      attempt: 1,
      at: '2026-05-21T00:01:10Z',
      error: 'failed to send slack message: channel_not_found',
    },
  ],
});
const diagnosticsByNotification = new Map([
  [
    'EVIDENCE_DIGEST',
    {
      notificationName: 'EVIDENCE_DIGEST',
      status: 'warning',
      checks: [
        {
          code: 'provider_slack_enabled',
          label: 'Slack provider enabled',
          status: 'pass',
          message: 'Slack provider is enabled.',
        },
        {
          code: 'configured_destination_slack',
          label: 'Slack destination configured',
          status: 'fail',
          message: 'No Slack destination is configured for evidence digest.',
        },
        {
          code: 'recent_digest_job',
          label: 'Recent digest job',
          status: 'pass',
          message: 'Latest digest job completed.',
          jobId: 241582,
          correlationId: 'evidence-digest:2026-05-21T00:00:01Z',
        },
      ],
      subscriberCounts: {
        email: 12,
        slack: 8,
        totalUsers: 14,
      },
      systemDestinations: [],
      staleJobs: [],
      discardedJobs: [],
      retryableErrors: [],
      recommendedActions: ['Add a Slack destination for Evidence Digest.'],
    },
  ],
  [
    'WORKFLOW_EXECUTION_FAILED',
    {
      notificationName: 'WORKFLOW_EXECUTION_FAILED',
      status: 'pass',
      checks: [
        {
          code: 'workflow_task_assigned',
          label: 'Workflow task assigned',
          status: 'pass',
          message: 'Workflow notification jobs are present.',
        },
      ],
    },
  ],
  [
    'RISK_NOTIFICATIONS',
    {
      notificationName: 'RISK_NOTIFICATIONS',
      status: 'warn',
      checks: [
        {
          code: 'risk_review_due_reminder',
          label: 'Risk review due reminder',
          status: 'warn',
          message: 'Risk review reminders have retryable errors.',
        },
      ],
    },
  ],
  [
    'POAM_NOTIFICATIONS',
    {
      notificationName: 'POAM_NOTIFICATIONS',
      status: 'fail',
      checks: [
        {
          code: 'poam_deadline_reminder',
          label: 'POAM deadline reminder',
          status: 'fail',
          message: 'POAM deadline jobs were not created.',
        },
      ],
    },
  ],
]);
const mockJobsGet = vi.fn();
const mockCreateDestination = vi.fn().mockResolvedValue(
  createDestinationExecuteResult({
    providerType: 'email',
    destinationTarget: 'alerts@example.com',
  }),
);
const mockDeleteDestination = vi.fn().mockResolvedValue({});
const mockAuthenticatedGet = vi.fn();
const mockAuthenticatedPost = vi.fn();
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
    post: mockAuthenticatedPost,
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

vi.mock('@/volt/Drawer.vue', () => ({
  default: {
    name: 'Drawer',
    props: ['visible', 'position', 'header'],
    emits: ['update:visible'],
    template: '<aside v-if="visible"><slot /></aside>',
  },
}));

import NotificationsView from '../admin/NotificationsView.vue';

describe('NotificationsView', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateDestination.mockResolvedValue(
      createDestinationExecuteResult({
        providerType: 'email',
        destinationTarget: 'alerts@example.com',
      }),
    );
    mockDeleteDestination.mockResolvedValue({});
    mockJobsGet.mockClear();
    mockAuthenticatedGet.mockImplementation((url: string, config?: unknown) => {
      if (url === '/api/auth/slack/link/status') {
        return Promise.resolve({
          data: {
            data: {
              linked: false,
            },
          },
        });
      }

      if (url === '/api/admin/notifications/health') {
        return Promise.resolve({
          data: {
            data: notificationHealth.value,
          },
        });
      }

      if (url === '/api/admin/notifications/jobs') {
        mockJobsGet(config);
        return Promise.resolve({
          data: {
            data: notificationJobs.value,
            pagination: {
              nextCursor: null,
            },
          },
        });
      }

      if (url === '/api/admin/notifications/jobs/241583') {
        return Promise.resolve({
          data: {
            data: notificationJobDetail.value,
          },
        });
      }

      const diagnosticsMatch = url.match(
        /^\/api\/admin\/notifications\/(.+)\/diagnostics$/,
      );

      if (diagnosticsMatch) {
        return Promise.resolve({
          data: {
            data:
              diagnosticsByNotification.get(
                decodeURIComponent(diagnosticsMatch[1]),
              ) ?? diagnosticsByNotification.get('EVIDENCE_DIGEST'),
          },
        });
      }

      throw new Error(`Unexpected authenticated get: ${url}`);
    });
    mockAuthenticatedPost.mockResolvedValue({
      data: {
        data: {
          accepted: true,
          mode: 'enqueue',
          providerType: 'slack',
          destinationTarget: 'ccf-slack-int',
          jobIds: [241600],
          message: 'Test notification enqueued.',
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
    notificationHealth.value = {
      worker: {
        enabled: true,
        mode: 'notify',
        pollOnly: false,
        queues: [
          {
            name: 'slack',
            maxWorkers: 5,
            available: 2,
            retryable: 1,
            running: 0,
            scheduled: 0,
            completed24h: 14,
            discarded24h: 1,
            oldestAvailableAt: '2026-05-21T00:01:00Z',
            staleCount: 1,
            staleThresholdSeconds: 600,
          },
        ],
      },
      providers: notificationProviders.value,
      notifications: [
        {
          name: 'EVIDENCE_DIGEST',
          configuredDestinations: [],
          subscriberCounts: {
            email: 12,
            slack: 8,
            totalUsers: 14,
          },
          warnings: [],
        },
      ],
      schedules: [
        {
          name: 'EVIDENCE_DIGEST',
          jobKind: 'send_global_digest',
          queue: 'digest',
          enabled: true,
          schedule: '@daily',
          nextRunAt: null,
          lastJob: {
            id: 241582,
            state: 'completed',
            createdAt: '2026-05-21T00:00:00Z',
            finalizedAt: '2026-05-21T00:00:01Z',
          },
        },
      ],
      warnings: [
        {
          code: 'slack_queue_backlog',
          severity: 'warning',
          message: 'Slack queue has jobs available for more than 10 minutes.',
          target: 'slack',
        },
      ],
    };
    notificationJobs.value = [
      {
        id: 241583,
        state: 'available',
        queue: 'slack',
        kind: 'send_channel',
        attempt: 0,
        maxAttempts: 5,
        createdAt: '2026-05-21T00:00:01Z',
        scheduledAt: '2026-05-21T00:00:01Z',
        attemptedAt: null,
        finalizedAt: null,
        notificationKind: 'evidence_digest',
        provider: 'slack',
        target: 'ccf-alerts',
        correlationId: 'evidence-digest:2026-05-21T00:00:01Z',
        sourceJobKind: 'send_global_digest',
        sourceJobId: '241582',
        lastError: null,
        stale: true,
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

    expect(wrapper.text()).toContain('Configuration');
    expect(wrapper.text()).toContain('Health');
    expect(wrapper.text()).toContain('Deliveries');
    expect(wrapper.text()).toContain('Diagnostics');
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

  it('renders health warnings and worker mode from the health endpoint', async () => {
    notificationProviders.value = notificationProviders.value.map((provider) =>
      provider.providerType === 'email'
        ? {
            ...provider,
            enabled: false,
          }
        : provider,
    );
    notificationHealth.value = {
      ...notificationHealth.value,
      worker: {
        ...notificationHealth.value.worker,
        mode: 'notify',
        pollOnly: false,
      },
      providers: notificationProviders.value,
      schedules: [],
    };

    const wrapper = mount(NotificationsView);
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Health')!
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Notify');
    expect(wrapper.text()).toContain(
      'Slack queue has jobs available for more than 10 minutes.',
    );
    expect(wrapper.text()).toContain('Email provider is disabled.');
    expect(wrapper.text()).toContain(
      'Evidence Digest has no configured system destination.',
    );
    expect(wrapper.text()).toContain('slack queue has 1 stale job.');
    expect(wrapper.text()).toContain(
      'slack queue has 1 discarded job in the last 24 hours.',
    );
    expect(wrapper.text()).toContain(
      'No upcoming scheduled notification runs were returned.',
    );
  });

  it('displays polling worker mode when the API reports poll-only mode', async () => {
    notificationHealth.value = {
      ...notificationHealth.value,
      worker: {
        ...notificationHealth.value.worker,
        mode: 'polling',
        pollOnly: true,
      },
    };

    const wrapper = mount(NotificationsView);
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Health')!
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Polling');
  });

  it('calls the jobs endpoint with delivery filter parameters', async () => {
    const wrapper = mount(NotificationsView);
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Deliveries')!
      .trigger('click');
    await flushPromises();

    await wrapper
      .find('#notifications-deliveries-panel')
      .find('select')
      .setValue('evidence_digest');
    await flushPromises();

    const lastParams = mockJobsGet.mock.calls.at(-1)?.[0] as {
      params?: Record<string, unknown>;
    };

    expect(lastParams.params).toMatchObject({
      notificationKind: 'evidence_digest',
      limit: 50,
    });
    expect(lastParams.params?.since).toEqual(expect.any(String));
  });

  it('lazy-loads operational tabs and pauses job auto-refresh outside deliveries', async () => {
    const wrapper = mount(NotificationsView);
    await flushPromises();

    expect(mockAuthenticatedGet).not.toHaveBeenCalledWith(
      '/api/admin/notifications/health',
    );
    expect(mockJobsGet).not.toHaveBeenCalled();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Health')!
      .trigger('click');
    await flushPromises();

    expect(mockAuthenticatedGet).toHaveBeenCalledWith(
      '/api/admin/notifications/health',
    );
    expect(mockJobsGet).not.toHaveBeenCalled();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Deliveries')!
      .trigger('click');
    await flushPromises();

    expect(mockJobsGet).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();

    await wrapper.find('input[type="checkbox"]').setValue(true);
    vi.advanceTimersByTime(30000);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockJobsGet).toHaveBeenCalledTimes(2);

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Configuration')!
      .trigger('click');
    vi.advanceTimersByTime(30000);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockJobsGet).toHaveBeenCalledTimes(2);

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Deliveries')!
      .trigger('click');
    vi.advanceTimersByTime(30000);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockJobsGet).toHaveBeenCalledTimes(3);
    wrapper.unmount();
  });

  it('renders sanitized job detail data without sensitive payload fields', async () => {
    const wrapper = mount(NotificationsView);
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Deliveries')!
      .trigger('click');
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '241583')!
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Job 241583');
    expect(wrapper.text()).toContain('ccf-alerts');
    expect(wrapper.text()).toContain('sourceJobKind');
    expect(wrapper.text()).toContain('failed to send slack message');
    expect(wrapper.text()).not.toContain('do-not-render');
    expect(wrapper.text()).not.toContain('htmlBody');
    expect(wrapper.text()).not.toContain('secret body');
    expect(wrapper.text()).not.toContain('secret block');
  });

  it('renders diagnostics checks for digest, workflow, risk, and POAM notifications', async () => {
    const wrapper = mount(NotificationsView);
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Diagnostics')!
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Slack provider enabled');
    expect(wrapper.text()).toContain('Slack destination configured');
    expect(wrapper.text()).toContain('Pass');
    expect(wrapper.text()).toContain('Fail');

    const diagnosticsSelect = wrapper
      .find('#notifications-diagnostics-panel')
      .find('select');
    await diagnosticsSelect.setValue('WORKFLOW_EXECUTION_FAILED');
    await flushPromises();
    expect(wrapper.text()).toContain('Workflow task assigned');

    await diagnosticsSelect.setValue('RISK_NOTIFICATIONS');
    await flushPromises();
    expect(wrapper.text()).toContain('Risk review due reminder');
    expect(wrapper.text()).toContain('Warn');

    await diagnosticsSelect.setValue('POAM_NOTIFICATIONS');
    await flushPromises();
    expect(wrapper.text()).toContain('POAM deadline reminder');
  });

  it('links diagnostics results to filtered deliveries', async () => {
    const wrapper = mount(NotificationsView);
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Diagnostics')!
      .trigger('click');
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Job 241582')!
      .trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Deliveries');
    expect(
      wrapper.find('[data-testid="deliveries-search"]').element,
    ).toHaveProperty('value', '241582');
    expect(mockJobsGet.mock.calls.at(-1)?.[0]).toMatchObject({
      params: {
        jobIdOrCorrelation: '241582',
      },
    });
  });

  it('marks delivery jobs read-only and omits queue mutation controls', async () => {
    const wrapper = mount(NotificationsView);
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Deliveries')!
      .trigger('click');

    expect(wrapper.text()).toContain('River notification jobs are read-only');
    expect(
      wrapper
        .findAll('button')
        .some((button) =>
          ['Retry', 'Discard', 'Cancel'].includes(button.text()),
        ),
    ).toBe(false);
  });
});
