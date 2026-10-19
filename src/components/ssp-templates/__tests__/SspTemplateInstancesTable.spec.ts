import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import SspTemplateInstancesTable from '../SspTemplateInstancesTable.vue';

const state = vi.hoisted(() => ({
  listConfig: undefined as unknown,
  instances: [] as unknown[],
  load: vi.fn(),
  forget: vi.fn(),
  confirmRequire: vi.fn(),
  toastAdd: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: (_url: unknown, config: { method?: string }) => {
    if (config.method === 'DELETE') {
      return { execute: state.forget };
    }
    state.listConfig = config;
    const data = ref<unknown[] | undefined>(undefined);
    state.load.mockImplementation(async () => {
      data.value = state.instances;
    });
    return {
      data,
      isLoading: ref(false),
      error: ref(null),
      execute: state.load,
    };
  },
}));

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: state.confirmRequire }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: state.toastAdd }),
}));

function mountTable() {
  return mount(SspTemplateInstancesTable, {
    props: { templateId: 't-1' },
    global: {
      stubs: {
        RouterLink: {
          props: ['to'],
          template:
            '<a data-testid="ssp-link" :data-id="to.params.id"><slot /></a>',
        },
      },
    },
  });
}

const forgetButton = (wrapper: ReturnType<typeof mountTable>) =>
  wrapper.findAll('button').find((button) => button.text() === 'Forget');

describe('SspTemplateInstancesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.forget.mockResolvedValue({});
    state.instances = [
      {
        keyValues: { _app: 'payments', aws_account: '111' },
        sspId: 'ssp-1',
        title: 'SSP for payments',
        createdAt: '2026-10-19T10:00:00Z',
        lastSeenAt: '2026-10-19T09:58:00Z',
        stale: true,
        lastError: 'profile attach failed',
        skippedEntries: 2,
      },
      {
        keyValues: { _app: 'old' },
        keyHash: 'abc123',
        sspId: null,
        title: 'SSP for old',
        createdAt: '2026-10-01T10:00:00Z',
        lastSeenAt: '2026-10-02T10:00:00Z',
        stale: false,
        lastError: null,
        skippedEntries: 0,
      },
    ];
  });

  it('lists created SSPs with label keys kept verbatim', async () => {
    const wrapper = mountTable();
    await flushPromises();

    expect(state.load).toHaveBeenCalledWith(
      '/api/admin/ssp-templates/t-1/ssps',
    );
    expect(state.listConfig).toEqual({
      camelcaseStopPaths: ['data.key-values'],
    });
    const rows = wrapper.findAll('[data-testid="ssp-template-instance"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('_app=payments, aws_account=111');
    expect(rows[0].find('[data-testid="ssp-link"]').attributes('data-id')).toBe(
      'ssp-1',
    );
    expect(rows[0].text()).toContain('Stale');
    expect(rows[0].text()).toContain('profile attach failed');
    expect(rows[0].text()).toContain('2 invalid value(s) skipped');
    expect(rows[0].text()).not.toContain('Forget');

    expect(rows[1].find('[data-testid="ssp-link"]').exists()).toBe(false);
    expect(rows[1].text()).toContain('SSP for old (deleted)');
    expect(rows[1].text()).not.toContain('Stale');
  });

  it('forgets a deleted SSP after confirmation and reloads', async () => {
    const wrapper = mountTable();
    await flushPromises();

    await forgetButton(wrapper)!.trigger('click');
    await state.confirmRequire.mock.calls[0][0].accept();
    await flushPromises();

    expect(state.forget).toHaveBeenCalledWith(
      '/api/admin/ssp-templates/t-1/ssps/abc123',
    );
    expect(state.load).toHaveBeenCalledTimes(2);
  });

  it('cannot forget without the key hash and reports a failed forget', async () => {
    (state.instances[1] as { keyHash?: string }).keyHash = undefined;
    let wrapper = mountTable();
    await flushPromises();
    expect(forgetButton(wrapper)!.attributes('disabled')).toBeDefined();

    (state.instances[1] as { keyHash?: string }).keyHash = 'abc123';
    state.forget.mockRejectedValue(new Error('SSP still exists'));
    wrapper = mountTable();
    await flushPromises();
    await forgetButton(wrapper)!.trigger('click');
    await state.confirmRequire.mock.calls[0][0].accept();
    await flushPromises();

    expect(state.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Forget failed',
        detail: 'SSP still exists',
      }),
    );
  });
});
