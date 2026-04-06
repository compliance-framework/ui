import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref, shallowRef } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import type {
  Agent,
  AgentServiceAccountKey,
  CreatedAgentServiceAccountKey,
} from '@/types/agents';

const agents = shallowRef<Agent[]>([]);
const agentKeys = shallowRef<AgentServiceAccountKey[]>([]);
const createdAgentData = shallowRef<Agent | undefined>(undefined);
const updatedAgentData = shallowRef<Agent | undefined>(undefined);
const createdKeyData = shallowRef<CreatedAgentServiceAccountKey | undefined>(
  undefined,
);

const agentsLoading = ref(false);
const keysLoading = ref(false);
const agentsError = ref<unknown>(null);
const keysError = ref<unknown>(null);
const createAgentLoading = ref(false);
const updateAgentLoading = ref(false);
const createKeyLoading = ref(false);

const mockLoadAgents = vi.fn().mockResolvedValue({});
const mockCreateAgent = vi.fn().mockImplementation(async () => {
  createdAgentData.value = {
    id: 'agent-3',
    name: 'new-agent',
    description: 'new agent description',
    isActive: true,
    serviceAccountKeyCount: 0,
    createdAt: '2026-04-06T12:00:00Z',
    updatedAt: '2026-04-06T12:00:00Z',
    lastAuthenticatedAt: null,
  };

  return {};
});
const mockUpdateAgent = vi.fn().mockImplementation(async () => {
  updatedAgentData.value = {
    ...agents.value[0],
    name: 'agent-one-updated',
    isActive: false,
  };

  return {};
});
const mockDeleteRequest = vi.fn().mockResolvedValue({});
const mockCreateKey = vi.fn().mockImplementation(async () => {
  createdKeyData.value = {
    id: 'key-2',
    name: 'primary',
    clientId: 'client-id-2',
    clientSecret: 'client-secret-2',
    neverExpires: true,
    createdAt: '2026-04-06T12:00:00Z',
    updatedAt: '2026-04-06T12:00:00Z',
    expiresAt: null,
    lastUsedAt: null,
    revokedAt: null,
  };

  return {};
});
const mockLoadKeys = vi.fn().mockImplementation(async (url: string) => {
  if (url.includes('/agent-1/')) {
    agentKeys.value = [
      {
        id: 'key-1',
        name: 'primary',
        clientId: 'client-id-1',
        neverExpires: true,
        createdAt: '2026-04-06T12:00:00Z',
        updatedAt: '2026-04-06T12:00:00Z',
        expiresAt: null,
        lastUsedAt: null,
        revokedAt: null,
      },
    ];
  } else {
    agentKeys.value = [
      {
        id: 'key-9',
        name: 'secondary',
        clientId: 'client-id-9',
        neverExpires: false,
        createdAt: '2026-04-06T12:00:00Z',
        updatedAt: '2026-04-06T12:00:00Z',
        expiresAt: '2026-04-07T12:00:00Z',
        lastUsedAt: '2026-04-06T13:00:00Z',
        revokedAt: null,
      },
    ];
  }

  return {};
});

const toastAdd = vi.fn();
const confirmRequire = vi.fn();
const clipboardWriteText = vi.fn().mockResolvedValue(undefined);

vi.mock('@/composables/axios', () => ({
  useDataApi: (
    url?: string | null,
    config?: {
      method?: string;
    },
  ) => {
    if (url === '/api/admin/agents' && config?.method === 'POST') {
      return {
        data: createdAgentData,
        execute: mockCreateAgent,
        isLoading: createAgentLoading,
      };
    }

    if (url === '/api/admin/agents') {
      return {
        data: agents,
        isLoading: agentsLoading,
        error: agentsError,
        execute: mockLoadAgents,
      };
    }

    if (url === null && config?.method === 'PUT') {
      return {
        data: updatedAgentData,
        execute: mockUpdateAgent,
        isLoading: updateAgentLoading,
      };
    }

    if (url === null && config?.method === 'POST') {
      return {
        data: createdKeyData,
        execute: mockCreateKey,
        isLoading: createKeyLoading,
      };
    }

    if (url === null && config?.method === 'DELETE') {
      return {
        execute: mockDeleteRequest,
      };
    }

    if (url === null) {
      return {
        data: agentKeys,
        isLoading: keysLoading,
        error: keysError,
        execute: mockLoadKeys,
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

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: confirmRequire,
  }),
}));

vi.mock('@/stores/config', () => ({
  useConfigStore: () => ({
    getConfig: vi.fn().mockResolvedValue({
      API_URL: 'https://api.example.test',
    }),
  }),
}));

vi.mock('@/components/PageHeader.vue', () => ({
  default: {
    name: 'PageHeader',
    template: '<h1><slot /></h1>',
  },
}));

vi.mock('@/components/PageSubHeader.vue', () => ({
  default: {
    name: 'PageSubHeader',
    template: '<h2><slot /></h2>',
  },
}));

vi.mock('@/volt/Message.vue', () => ({
  default: {
    name: 'Message',
    template: '<div><slot /></div>',
  },
}));

vi.mock('@/volt/Dialog.vue', () => ({
  default: {
    name: 'Dialog',
    props: ['visible', 'header'],
    emits: ['update:visible'],
    template: '<div v-if="visible"><h3>{{ header }}</h3><slot /></div>',
  },
}));

vi.mock('@/volt/PrimaryButton.vue', () => ({
  default: {
    name: 'PrimaryButton',
    props: ['disabled', 'type'],
    emits: ['click'],
    template:
      '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
}));

vi.mock('@/volt/TertiaryButton.vue', () => ({
  default: {
    name: 'TertiaryButton',
    props: ['disabled', 'type'],
    emits: ['click'],
    template:
      '<button :type="type || \'button\'" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
}));

vi.mock('@/volt/Tabs.vue', () => ({
  default: {
    name: 'Tabs',
    template: '<div><slot /></div>',
  },
}));

vi.mock('@/volt/TabList.vue', () => ({
  default: {
    name: 'TabList',
    template: '<div><slot /></div>',
  },
}));

vi.mock('@/volt/Tab.vue', () => ({
  default: {
    name: 'Tab',
    template: '<button type="button"><slot /></button>',
  },
}));

vi.mock('@/volt/TabPanels.vue', () => ({
  default: {
    name: 'TabPanels',
    template: '<div><slot /></div>',
  },
}));

vi.mock('@/volt/TabPanel.vue', () => ({
  default: {
    name: 'TabPanel',
    template: '<section><slot /></section>',
  },
}));

import AgentsView from '../admin/AgentsView.vue';

describe('AgentsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    agents.value = [
      {
        id: 'agent-1',
        name: 'agent-one',
        description: 'first agent',
        isActive: true,
        serviceAccountKeyCount: 1,
        createdAt: '2026-04-06T10:00:00Z',
        updatedAt: '2026-04-06T10:00:00Z',
        lastAuthenticatedAt: null,
      },
      {
        id: 'agent-2',
        name: 'agent-two',
        description: 'second agent',
        isActive: false,
        serviceAccountKeyCount: 0,
        createdAt: '2026-04-06T11:00:00Z',
        updatedAt: '2026-04-06T11:00:00Z',
        lastAuthenticatedAt: '2026-04-06T11:30:00Z',
      },
    ];
    agentKeys.value = [];
    createdAgentData.value = undefined;
    updatedAgentData.value = undefined;
    createdKeyData.value = undefined;
    agentsLoading.value = false;
    keysLoading.value = false;
    agentsError.value = null;
    keysError.value = null;
    createAgentLoading.value = false;
    updateAgentLoading.value = false;
    createKeyLoading.value = false;
  });

  const findButtonByText = (
    wrapper: ReturnType<typeof mount>,
    label: string,
  ) => {
    return wrapper.findAll('button').find((button) => button.text() === label);
  };

  function mountView() {
    Object.defineProperty(window.navigator, 'clipboard', {
      value: {
        writeText: clipboardWriteText,
      },
      configurable: true,
    });

    return mount(AgentsView);
  }

  it('loads keys for the initially selected agent', async () => {
    const wrapper = mountView();

    await flushPromises();

    expect(wrapper.text()).toContain('agent-one');
    expect(mockLoadKeys).toHaveBeenCalledWith('/api/admin/agents/agent-1/keys');
    expect(wrapper.text()).toContain('client-id-1');
  });

  it('creates an agent and refreshes the list', async () => {
    const wrapper = mountView();
    await flushPromises();

    await findButtonByText(wrapper, 'Register Agent')!.trigger('click');
    await wrapper
      .find('input[placeholder="e.g. compliance-collector"]')
      .setValue('new-agent');
    await wrapper
      .find('textarea[placeholder="Optional description"]')
      .setValue('new agent description');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreateAgent).toHaveBeenCalledWith('/api/admin/agents', {
      data: {
        name: 'new-agent',
        description: 'new agent description',
        isActive: true,
      },
    });
    expect(mockLoadAgents).toHaveBeenCalled();
  });

  it('edits the selected agent', async () => {
    const wrapper = mountView();
    await flushPromises();

    await findButtonByText(wrapper, 'Edit')!.trigger('click');
    const nameInput = wrapper.find(
      'input[placeholder="e.g. compliance-collector"]',
    );
    await nameInput.setValue('agent-one-updated');
    await wrapper.find('input[type="checkbox"]').setValue(false);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockUpdateAgent).toHaveBeenCalledWith('/api/admin/agents/agent-1', {
      data: {
        name: 'agent-one-updated',
        description: 'first agent',
        isActive: false,
      },
    });
  });

  it('creates a never-expiring service account key and shows the secret modal', async () => {
    const wrapper = mountView();
    await flushPromises();

    await findButtonByText(wrapper, 'Create Service Account Key')!.trigger(
      'click',
    );
    await wrapper.find('input[placeholder="e.g. primary"]').setValue('primary');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreateKey).toHaveBeenCalledWith(
      '/api/admin/agents/agent-1/keys',
      {
        data: {
          name: 'primary',
          neverExpires: true,
        },
      },
    );
    expect(wrapper.text()).toContain('Service Account Key Created');
    expect(wrapper.text()).toContain('client-id-2');
    expect(wrapper.text()).toContain('client-secret-2');
    expect(wrapper.text()).toContain(
      'https://api.example.test/api/auth/agent/token',
    );
  });

  it('creates an expiring service account key with a future expiry', async () => {
    const wrapper = mountView();
    await flushPromises();

    await findButtonByText(wrapper, 'Create Service Account Key')!.trigger(
      'click',
    );

    const checkbox = wrapper.findAll('input[type="checkbox"]')[0];
    await checkbox.setValue(false);
    await wrapper
      .find('input[type="datetime-local"]')
      .setValue('2026-04-07T09:30');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreateKey).toHaveBeenCalledWith(
      '/api/admin/agents/agent-1/keys',
      {
        data: {
          neverExpires: false,
          expiresAt: new Date('2026-04-07T09:30').toISOString(),
        },
      },
    );
  });

  it('revokes a key and refreshes the data', async () => {
    const wrapper = mountView();
    await flushPromises();

    await findButtonByText(wrapper, 'Revoke')!.trigger('click');
    expect(confirmRequire).toHaveBeenCalledTimes(1);

    await confirmRequire.mock.calls[0][0].accept();
    await flushPromises();

    expect(mockDeleteRequest).toHaveBeenCalledWith(
      '/api/admin/agents/agent-1/keys/key-1',
    );
    expect(mockLoadAgents).toHaveBeenCalled();
    expect(mockLoadKeys).toHaveBeenCalledWith('/api/admin/agents/agent-1/keys');
  });

  it('shows the empty state when there are no agents', async () => {
    agents.value = [];

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain('No agents found.');
    expect(wrapper.text()).toContain(
      'Select or register an agent to manage service account keys.',
    );
  });
});
