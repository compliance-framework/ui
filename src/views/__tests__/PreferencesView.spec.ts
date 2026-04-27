import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, type ComponentPublicInstance } from 'vue';
import PreferencesView from '../PreferencesView.vue';

// Mock the composables
const mockAxios = {
  get: vi.fn(),
  put: vi.fn(),
};

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => mockAxios,
}));

// Mock components
vi.mock('@/components/PageHeader.vue', () => ({
  default: {
    name: 'PageHeader',
    template: '<header><slot></slot></header>',
  },
}));

vi.mock('@/components/PageCard.vue', () => ({
  default: {
    name: 'PageCard',
    template: '<div class="page-card"><slot></slot></div>',
  },
}));

vi.mock('@/components/preferences/SlackAccountLinkSection.vue', () => ({
  default: {
    name: 'SlackAccountLinkSection',
    emits: ['status-change'],
    template: '<div data-test="slack-account-link-section"></div>',
  },
}));

const emitSlackStatus = async (
  wrapper: VueWrapper<ComponentPublicInstance>,
  state: { loading: boolean; configured: boolean; linked: boolean },
) => {
  await flushPromises();
  await nextTick();
  wrapper
    .getComponent({ name: 'SlackAccountLinkSection' })
    .vm.$emit('status-change', state);
  await nextTick();
  await flushPromises();
  await nextTick();
};

const createDeferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve,
    reject,
  };
};

const notificationProvidersResponse = () =>
  Promise.resolve({
    data: {
      data: [
        { providerType: 'email', enabled: true },
        { providerType: 'slack', enabled: true },
      ],
    },
  });

interface PreferencesViewTestVm extends ComponentPublicInstance {
  [key: string]: unknown;
  updateNotificationPreferences: () => Promise<void>;
  onTaskAvailableChannelsChange: (channels: string[]) => Promise<void>;
  onEvidenceDigestChannelsChange: (channels: string[]) => Promise<void>;
  onTaskDailyDigestChannelsChange: (channels: string[]) => Promise<void>;
  onRiskNotificationsChannelsChange: (channels: string[]) => Promise<void>;
}

const mountPreferencesView = () =>
  mount(PreferencesView) as unknown as VueWrapper<PreferencesViewTestVm>;

describe('PreferencesView', () => {
  let wrapper: VueWrapper<PreferencesViewTestVm>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockAxios.get.mockImplementation((url: string) => {
      if (url === '/api/users/me') {
        return Promise.resolve({
          data: {
            data: {
              id: 'user-1',
              email: 'user@example.com',
              firstName: 'User',
              lastName: 'Example',
              failedLogins: 0,
            },
          },
        });
      }

      if (url === '/api/users/me/subscriptions') {
        return Promise.resolve({
          data: {
            data: {
              notifications: {
                evidenceDigest: [],
                taskAvailable: [],
                riskNotifications: [],
              },
            },
          },
        });
      }

      if (url === '/api/notifications/providers') {
        return notificationProvidersResponse();
      }

      return Promise.reject(new Error(`Unexpected GET URL: ${url}`));
    });

    mockAxios.put.mockResolvedValue({ data: { data: {} } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('shows loading state initially', () => {
      wrapper = mountPreferencesView();

      expect(wrapper.vm.loading).toBe(true);
    });

    it('renders preferences page structure', () => {
      wrapper = mountPreferencesView();

      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.$options).toBeDefined();
    });
  });

  describe('Component State', () => {
    it('has correct initial state', () => {
      wrapper = mountPreferencesView();

      expect(wrapper.vm.loading).toBe(true);
      expect(wrapper.vm.updating).toBe(false);
      expect(wrapper.vm.evidenceDigestAlertChannels).toEqual([]);
      expect(wrapper.vm.taskAvailableAlertChannels).toEqual([]);
      expect(wrapper.vm.taskDailyDigestAlertChannels).toEqual([]);
      expect(wrapper.vm.riskNotificationsAlertChannels).toEqual([]);
      expect(wrapper.vm.updateError).toBeNull();
      expect(wrapper.vm.updateSuccess).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('has error state variables', () => {
      wrapper = mountPreferencesView();

      expect(wrapper.vm.updateError).toBeNull();
      expect(wrapper.vm.loadError).toBeNull();
    });
  });

  describe('Timeout Cleanup', () => {
    it('has timeout ref for cleanup', () => {
      wrapper = mountPreferencesView();

      expect(wrapper.vm.successTimeoutId).toBeDefined();
    });

    it('cleans up timeout on unmount', () => {
      wrapper = mountPreferencesView();

      // Set a timeout
      wrapper.vm.successTimeoutId = window.setTimeout(() => {}, 1000);

      // Unmount
      wrapper.unmount();

      // Should not throw error
      expect(wrapper.vm.successTimeoutId).toBeDefined();
    });
  });

  describe('Methods', () => {
    it('has loadUserData method', () => {
      wrapper = mountPreferencesView();

      expect(typeof wrapper.vm.loadUserData).toBe('function');
    });

    it('has updateNotificationPreferences method', () => {
      wrapper = mountPreferencesView();

      expect(typeof wrapper.vm.updateNotificationPreferences).toBe('function');
    });
  });

  describe('Email preferences integration', () => {
    it('loads all email preference toggles from API', async () => {
      mockAxios.get.mockImplementation((url: string) => {
        if (url === '/api/users/me') {
          return Promise.resolve({
            data: {
              data: {
                id: 'user-1',
                email: 'user@example.com',
                firstName: 'User',
                lastName: 'Example',
                failedLogins: 0,
              },
            },
          });
        }

        if (url === '/api/users/me/subscriptions') {
          return Promise.resolve({
            data: {
              data: {
                notifications: {
                  evidenceDigest: ['email', 'slack'],
                  taskAvailable: ['email', 'slack'],
                  riskNotifications: ['email', 'slack'],
                },
              },
            },
          });
        }

        if (url === '/api/notifications/providers') {
          return notificationProvidersResponse();
        }

        return Promise.reject(new Error(`Unexpected GET URL: ${url}`));
      });

      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();
      await emitSlackStatus(wrapper, {
        loading: false,
        configured: true,
        linked: true,
      });

      expect(wrapper.vm.evidenceDigestAlertChannels).toEqual([
        'email',
        'slack',
      ]);
      expect(wrapper.vm.taskAvailableAlertChannels).toEqual(['email', 'slack']);
      expect(wrapper.vm.taskDailyDigestAlertChannels).toEqual([]);
      expect(wrapper.vm.riskNotificationsAlertChannels).toEqual([
        'email',
        'slack',
      ]);
    });

    it('loads notification channels from transformed response keys', async () => {
      mockAxios.get.mockImplementation((url: string) => {
        if (url === '/api/users/me') {
          return Promise.resolve({
            data: {
              data: {
                id: 'user-1',
                email: 'user@example.com',
                firstName: 'User',
                lastName: 'Example',
                failedLogins: 0,
              },
            },
          });
        }

        if (url === '/api/users/me/subscriptions') {
          return Promise.resolve({
            data: {
              data: {
                notifications: {
                  evidenceDigest: ['email'],
                  taskAvailable: ['email'],
                  riskNotifications: ['email'],
                },
              },
            },
          });
        }

        if (url === '/api/notifications/providers') {
          return notificationProvidersResponse();
        }

        return Promise.reject(new Error(`Unexpected GET URL: ${url}`));
      });

      wrapper = mountPreferencesView();

      await flushPromises();
      await nextTick();

      expect(wrapper.vm.evidenceDigestAlertChannels).toEqual(['email']);
      expect(wrapper.vm.taskAvailableAlertChannels).toEqual(['email']);
      expect(wrapper.vm.riskNotificationsAlertChannels).toEqual(['email']);
    });

    it('keeps preferences available when notification providers fail to load', async () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      mockAxios.get.mockImplementation((url: string) => {
        if (url === '/api/users/me') {
          return Promise.resolve({
            data: {
              data: {
                id: 'user-1',
                email: 'user@example.com',
                firstName: 'User',
                lastName: 'Example',
                failedLogins: 0,
              },
            },
          });
        }

        if (url === '/api/users/me/subscriptions') {
          return Promise.resolve({
            data: {
              data: {
                notifications: {
                  evidenceDigest: ['email', 'slack'],
                  taskAvailable: ['email', 'slack'],
                  taskDailyDigest: ['email'],
                  riskNotifications: ['slack'],
                },
              },
            },
          });
        }

        if (url === '/api/notifications/providers') {
          return Promise.reject(new Error('Providers unavailable'));
        }

        return Promise.reject(new Error(`Unexpected GET URL: ${url}`));
      });

      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();
      await emitSlackStatus(wrapper, {
        loading: false,
        configured: true,
        linked: true,
      });

      expect(wrapper.vm.loadError).toBeNull();
      expect(wrapper.vm.evidenceDigestAlertChannels).toEqual([
        'email',
        'slack',
      ]);
      expect(wrapper.vm.taskAvailableAlertChannels).toEqual(['email', 'slack']);
      expect(wrapper.vm.taskDailyDigestAlertChannels).toEqual(['email']);
      expect(wrapper.vm.riskNotificationsAlertChannels).toEqual(['slack']);
      expect(wrapper.vm.notificationChannelOptions).toEqual([
        {
          label: 'Email',
          value: 'email',
          disabled: false,
          disabledTooltip: undefined,
        },
        {
          label: 'Slack',
          value: 'slack',
          disabled: false,
          disabledTooltip: undefined,
        },
      ]);
      expect(consoleError).toHaveBeenCalledWith(
        'Error loading notification providers:',
        expect.any(Error),
      );

      consoleError.mockRestore();
    });

    it('initializes channel selection as empty array when notifications are empty', async () => {
      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();

      expect(wrapper.vm.evidenceDigestAlertChannels).toEqual([]);
      expect(wrapper.vm.taskAvailableAlertChannels).toEqual([]);
      expect(wrapper.vm.riskNotificationsAlertChannels).toEqual([]);
    });

    it('defaults to empty selections when notifications are missing', async () => {
      mockAxios.get.mockImplementation((url: string) => {
        if (url === '/api/users/me') {
          return Promise.resolve({
            data: {
              data: {
                id: 'user-1',
                email: 'user@example.com',
                firstName: 'User',
                lastName: 'Example',
                failedLogins: 0,
              },
            },
          });
        }

        if (url === '/api/users/me/subscriptions') {
          return Promise.resolve({
            data: {
              data: {},
            },
          });
        }

        if (url === '/api/notifications/providers') {
          return notificationProvidersResponse();
        }

        return Promise.reject(new Error(`Unexpected GET URL: ${url}`));
      });

      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();

      expect(wrapper.vm.evidenceDigestAlertChannels).toEqual([]);
      expect(wrapper.vm.taskAvailableAlertChannels).toEqual([]);
      expect(wrapper.vm.riskNotificationsAlertChannels).toEqual([]);
    });

    it('falls back to empty selections when notification channels are malformed', async () => {
      mockAxios.get.mockImplementation((url: string) => {
        if (url === '/api/users/me') {
          return Promise.resolve({
            data: {
              data: {
                id: 'user-1',
                email: 'user@example.com',
                firstName: 'User',
                lastName: 'Example',
                failedLogins: 0,
              },
            },
          });
        }

        if (url === '/api/users/me/subscriptions') {
          return Promise.resolve({
            data: {
              data: {
                notifications: {
                  evidenceDigest: 'email',
                  taskAvailable: { channel: 'email' },
                  taskDailyDigest: 123,
                  riskNotifications: { channel: 'email' },
                },
              },
            },
          });
        }

        if (url === '/api/notifications/providers') {
          return notificationProvidersResponse();
        }

        return Promise.reject(new Error(`Unexpected GET URL: ${url}`));
      });

      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();

      expect(wrapper.vm.evidenceDigestAlertChannels).toEqual([]);
      expect(wrapper.vm.taskAvailableAlertChannels).toEqual([]);
      expect(wrapper.vm.taskDailyDigestAlertChannels).toEqual([]);
      expect(wrapper.vm.riskNotificationsAlertChannels).toEqual([]);
      expect(wrapper.vm.loadError).toBeNull();
    });

    it('sends all email preference fields when updating', async () => {
      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();
      await emitSlackStatus(wrapper, {
        loading: false,
        configured: true,
        linked: true,
      });

      wrapper.vm.evidenceDigestAlertChannels = ['email', 'slack'];
      wrapper.vm.taskAvailableAlertChannels = ['email', 'slack'];
      wrapper.vm.taskDailyDigestAlertChannels = ['email'];
      wrapper.vm.riskNotificationsAlertChannels = ['slack'];

      await wrapper.vm.updateNotificationPreferences();

      expect(mockAxios.put).toHaveBeenCalledWith(
        '/api/users/me/subscriptions',
        {
          notifications: {
            evidence_digest: ['email', 'slack'],
            task_available: ['email', 'slack'],
            task_daily_digest: ['email'],
            risk_notifications: ['slack'],
          },
        },
      );
      expect(wrapper.vm.updateSuccess).toBe(true);
    });

    it('saves task available channel selection in notifications.task_available', async () => {
      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();
      await emitSlackStatus(wrapper, {
        loading: false,
        configured: true,
        linked: true,
      });

      await wrapper.vm.onTaskAvailableChannelsChange(['slack']);

      expect(mockAxios.put).toHaveBeenCalledWith(
        '/api/users/me/subscriptions',
        {
          notifications: {
            evidence_digest: [],
            task_available: ['slack'],
            task_daily_digest: [],
            risk_notifications: [],
          },
        },
      );
      expect(wrapper.vm.taskAvailableAlertChannels).toEqual(['slack']);
    });

    it('saves evidence digest channel selection in notifications.evidence_digest', async () => {
      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();
      await emitSlackStatus(wrapper, {
        loading: false,
        configured: true,
        linked: true,
      });

      await wrapper.vm.onEvidenceDigestChannelsChange(['email', 'slack']);

      expect(mockAxios.put).toHaveBeenCalledWith(
        '/api/users/me/subscriptions',
        {
          notifications: {
            evidence_digest: ['email', 'slack'],
            task_available: [],
            task_daily_digest: [],
            risk_notifications: [],
          },
        },
      );
      expect(wrapper.vm.evidenceDigestAlertChannels).toEqual([
        'email',
        'slack',
      ]);
    });

    it('saves daily task digest channel selection in notifications.task_daily_digest', async () => {
      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();
      await emitSlackStatus(wrapper, {
        loading: false,
        configured: true,
        linked: true,
      });

      await wrapper.vm.onTaskDailyDigestChannelsChange(['email', 'slack']);

      expect(mockAxios.put).toHaveBeenCalledWith(
        '/api/users/me/subscriptions',
        {
          notifications: {
            evidence_digest: [],
            task_available: [],
            task_daily_digest: ['email', 'slack'],
            risk_notifications: [],
          },
        },
      );
      expect(wrapper.vm.taskDailyDigestAlertChannels).toEqual([
        'email',
        'slack',
      ]);
    });

    it('saves risk notification channel selection in notifications.risk_notifications', async () => {
      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();
      await emitSlackStatus(wrapper, {
        loading: false,
        configured: true,
        linked: true,
      });

      await wrapper.vm.onRiskNotificationsChannelsChange(['email', 'slack']);

      expect(mockAxios.put).toHaveBeenCalledWith(
        '/api/users/me/subscriptions',
        {
          notifications: {
            evidence_digest: [],
            task_available: [],
            task_daily_digest: [],
            risk_notifications: ['email', 'slack'],
          },
        },
      );
      expect(wrapper.vm.riskNotificationsAlertChannels).toEqual([
        'email',
        'slack',
      ]);
    });

    it('updates alert channels correctly', async () => {
      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();
      await emitSlackStatus(wrapper, {
        loading: false,
        configured: true,
        linked: true,
      });

      expect(wrapper.vm.taskAvailableAlertChannels).toEqual([]);

      // Set both channels
      await wrapper.vm.onTaskAvailableChannelsChange(['email', 'slack']);
      expect(wrapper.vm.taskAvailableAlertChannels).toContain('slack');
      expect(wrapper.vm.taskAvailableAlertChannels).toContain('email');

      // Set only slack
      await wrapper.vm.onTaskAvailableChannelsChange(['slack']);
      expect(wrapper.vm.taskAvailableAlertChannels).not.toContain('email');
      expect(wrapper.vm.taskAvailableAlertChannels).toEqual(['slack']);

      // Set none
      await wrapper.vm.onTaskAvailableChannelsChange([]);
      expect(wrapper.vm.taskAvailableAlertChannels).toEqual([]);

      // Verify the API call was made
      expect(mockAxios.put).toHaveBeenCalled();
    });

    it('disables Slack task alerts when Slack is not configured', async () => {
      mockAxios.get.mockImplementation((url: string) => {
        if (url === '/api/users/me') {
          return Promise.resolve({
            data: {
              data: {
                id: 'user-1',
                email: 'user@example.com',
                firstName: 'User',
                lastName: 'Example',
                failedLogins: 0,
              },
            },
          });
        }

        if (url === '/api/users/me/subscriptions') {
          return Promise.resolve({
            data: {
              data: {
                notifications: {
                  evidenceDigest: [],
                  taskAvailable: ['email', 'slack'],
                  taskDailyDigest: [],
                  riskNotifications: ['email', 'slack'],
                },
              },
            },
          });
        }

        if (url === '/api/notifications/providers') {
          return notificationProvidersResponse();
        }

        return Promise.reject(new Error(`Unexpected GET URL: ${url}`));
      });

      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();
      await emitSlackStatus(wrapper, {
        loading: false,
        configured: false,
        linked: false,
      });

      expect(wrapper.vm.taskAvailableAlertChannels).toEqual(['email']);
      expect(wrapper.vm.notificationChannelOptions).toEqual([
        {
          label: 'Email',
          value: 'email',
          disabled: false,
          disabledTooltip: undefined,
        },
        {
          label: 'Slack',
          value: 'slack',
          disabled: true,
          disabledTooltip:
            'Slack alerts are unavailable because Slack integration is not configured for this environment.',
        },
      ]);
      expect(mockAxios.put).toHaveBeenLastCalledWith(
        '/api/users/me/subscriptions',
        {
          notifications: {
            evidence_digest: [],
            task_available: ['email'],
            task_daily_digest: [],
            risk_notifications: ['email'],
          },
        },
      );

      await wrapper.vm.onTaskAvailableChannelsChange(['email', 'slack']);

      expect(mockAxios.put).toHaveBeenLastCalledWith(
        '/api/users/me/subscriptions',
        {
          notifications: {
            evidence_digest: [],
            task_available: ['email'],
            task_daily_digest: [],
            risk_notifications: ['email'],
          },
        },
      );
    });

    it('removes Slack from all selected notification channels when Slack becomes unavailable', async () => {
      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();
      await emitSlackStatus(wrapper, {
        loading: false,
        configured: true,
        linked: true,
      });

      wrapper.vm.evidenceDigestAlertChannels = ['email', 'slack'];
      wrapper.vm.taskAvailableAlertChannels = ['slack'];
      wrapper.vm.taskDailyDigestAlertChannels = ['email', 'slack'];
      wrapper.vm.riskNotificationsAlertChannels = ['slack'];
      wrapper.vm.lastSavedPreferences = {
        notifications: {
          evidence_digest: ['email', 'slack'],
          task_available: ['slack'],
          task_daily_digest: ['email', 'slack'],
          risk_notifications: ['slack'],
        },
      };

      await emitSlackStatus(wrapper, {
        loading: false,
        configured: true,
        linked: false,
      });

      expect(wrapper.vm.evidenceDigestAlertChannels).toEqual(['email']);
      expect(wrapper.vm.taskAvailableAlertChannels).toEqual([]);
      expect(wrapper.vm.taskDailyDigestAlertChannels).toEqual(['email']);
      expect(wrapper.vm.riskNotificationsAlertChannels).toEqual([]);
      expect(wrapper.vm.lastSavedPreferences).toEqual({
        notifications: {
          evidence_digest: ['email'],
          task_available: [],
          task_daily_digest: ['email'],
          risk_notifications: [],
        },
      });
      expect(mockAxios.put).toHaveBeenLastCalledWith(
        '/api/users/me/subscriptions',
        {
          notifications: {
            evidence_digest: ['email'],
            task_available: [],
            task_daily_digest: ['email'],
            risk_notifications: [],
          },
        },
      );
    });

    it('serializes Slack sync saves behind an in-flight notification update', async () => {
      const firstPut = createDeferred<{
        data: { data: Record<string, never> };
      }>();
      const secondPut = createDeferred<{
        data: { data: Record<string, never> };
      }>();

      mockAxios.put
        .mockImplementationOnce(() => firstPut.promise)
        .mockImplementationOnce(() => secondPut.promise);

      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();
      await emitSlackStatus(wrapper, {
        loading: false,
        configured: true,
        linked: true,
      });

      const firstUpdatePromise = wrapper.vm.onTaskAvailableChannelsChange([
        'email',
        'slack',
      ]);

      await Promise.resolve();
      await nextTick();

      expect(mockAxios.put).toHaveBeenCalledTimes(1);
      expect(mockAxios.put).toHaveBeenNthCalledWith(
        1,
        '/api/users/me/subscriptions',
        {
          notifications: {
            evidence_digest: [],
            task_available: ['email', 'slack'],
            task_daily_digest: [],
            risk_notifications: [],
          },
        },
      );

      wrapper
        .getComponent({ name: 'SlackAccountLinkSection' })
        .vm.$emit('status-change', {
          loading: false,
          configured: true,
          linked: false,
        });
      await nextTick();
      await Promise.resolve();
      await nextTick();

      expect(wrapper.vm.taskAvailableAlertChannels).toEqual(['email']);
      expect(mockAxios.put).toHaveBeenCalledTimes(1);

      firstPut.resolve({ data: { data: {} } });
      await Promise.resolve();
      await nextTick();

      expect(mockAxios.put).toHaveBeenCalledTimes(2);
      expect(mockAxios.put).toHaveBeenNthCalledWith(
        2,
        '/api/users/me/subscriptions',
        {
          notifications: {
            evidence_digest: [],
            task_available: ['email'],
            task_daily_digest: [],
            risk_notifications: [],
          },
        },
      );

      await nextTick();

      secondPut.resolve({ data: { data: {} } });
      await firstUpdatePromise;
      await flushPromises();
      await nextTick();

      expect(wrapper.vm.lastSavedPreferences).toEqual({
        notifications: {
          evidence_digest: [],
          task_available: ['email'],
          task_daily_digest: [],
          risk_notifications: [],
        },
      });
    });

    it('disables Slack task alerts when the Slack account is not linked', async () => {
      wrapper = mountPreferencesView();

      await Promise.resolve();
      await nextTick();
      await emitSlackStatus(wrapper, {
        loading: false,
        configured: true,
        linked: false,
      });

      expect(wrapper.vm.notificationChannelOptions).toEqual([
        {
          label: 'Email',
          value: 'email',
          disabled: false,
          disabledTooltip: undefined,
        },
        {
          label: 'Slack',
          value: 'slack',
          disabled: true,
          disabledTooltip:
            'Link your Slack account below to enable Slack alerts.',
        },
      ]);
    });
  });

  describe('Accessibility', () => {
    it('has proper template structure', () => {
      wrapper = mountPreferencesView();

      // Check that the component renders without errors
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.$options).toBeDefined();
    });
  });
});
