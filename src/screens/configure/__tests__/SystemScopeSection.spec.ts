import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import Menu from '@/ds/components/Menu/Menu.vue';
import type { MenuAction } from '@/ds/components/Menu/menuEntries';
import ScopePanel from '../SystemScopeSection.vue';

const state = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  decamelizeKeys: vi.fn(),
  can: vi.fn(() => true),
  confirmRequire: vi.fn(),
  toastAdd: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({
    get: state.get,
    post: state.post,
    put: state.put,
    delete: state.delete,
  }),
  decamelizeKeys: state.decamelizeKeys,
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    can: state.can,
    permissionTooltip: () => 'No permission',
  }),
}));

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: state.confirmRequire }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: state.toastAdd }),
}));

const scope = {
  autoFilters: false,
  entries: [
    {
      id: 'e-1',
      labels: [
        { key: 'aws_account', value: '111' },
        { key: 'region', value: 'eu-west-1' },
      ],
      origin: 'manual',
      createdAt: '2026-10-19T10:00:00Z',
    },
    {
      id: 'e-2',
      labels: [{ key: 'repo', value: 'a' }],
      origin: 'template',
      templateId: 't-1',
      createdAt: '2026-10-19T10:00:00Z',
    },
  ],
  exceptions: [
    {
      id: 'x-1',
      labels: [{ key: 'repo', value: 'oops' }],
      createdAt: '2026-10-18T09:12:00Z',
    },
  ],
};

function mockGet(currentScope: unknown = scope) {
  state.get.mockImplementation((url: string) =>
    Promise.resolve({
      data: {
        data: url.endsWith('/label-keys')
          ? [
              { key: 'repo', values: ['a', 'b'] },
              { key: 'env', values: ['prod'] },
            ]
          : currentScope,
      },
    }),
  );
}

function mountPanel() {
  const root = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () => h(ScopePanel, { sspId: 'ssp-1' })),
    }),
    {
      global: {
        stubs: {
          LabelConditionBuilder: {
            name: 'LabelConditionBuilder',
            props: ['modelValue', 'sspId', 'keys', 'ignoreScope'],
            emits: ['update:modelValue'],
            template: '<div data-testid="builder" />',
          },
        },
      },
    },
  );
  return root;
}

/** The row menus: entries first, then exceptions. */
function action(wrapper: ReturnType<typeof mountPanel>, label: string) {
  for (const menu of wrapper.findAllComponents(Menu)) {
    const item = (menu.props('items') as MenuAction[]).find(
      (i) => i.label === label,
    );
    if (item) return item;
  }
  throw new Error(`No menu item ${label}`);
}

describe('SystemScopeSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    state.can.mockReturnValue(true);
    mockGet();
    state.post.mockResolvedValue({ data: { data: {} } });
    state.put.mockResolvedValue({ data: {} });
    state.delete.mockResolvedValue({ data: {} });
  });

  it('lists entries as AND-ed labels with their origin, and the exceptions', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    const entries = wrapper.findAll('[data-testid="scope-entry"]');
    expect(entries).toHaveLength(2);
    expect(entries[0].text()).toContain('aws_account=111');
    expect(entries[0].text()).toContain('AND');
    expect(entries[0].text()).toContain('region=eu-west-1');
    const row = (i: number) => entries[i]!.element.closest('tr')!.textContent;
    expect(row(0)).toContain('Manual');
    expect(row(1)).toContain('Template');
    expect(wrapper.findAll('[data-testid="scope-exception"]')).toHaveLength(1);
  });

  it('suggests label keys from all evidence, ignoring the scope', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    expect(state.get).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/dashboard-suggestions/label-keys',
      { params: { ignoreScope: true } },
    );
    const builder = wrapper.findComponent({ name: 'LabelConditionBuilder' });
    expect(builder.props('keys')).toEqual(['repo', 'env']);
    expect(builder.props('ignoreScope')).toBe(true);
  });

  it('shows an empty state when the scope has no entries', async () => {
    mockGet({ autoFilters: false, entries: [], exceptions: [] });
    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.find('[data-testid="scope-empty"]').exists()).toBe(true);
  });

  it('reports a failed load instead of claiming the scope is empty', async () => {
    state.get.mockImplementation((url: string) =>
      url.endsWith('/label-keys')
        ? Promise.resolve({ data: { data: [] } })
        : Promise.reject(new Error('boom')),
    );
    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.find('[data-testid="scope-empty"]').exists()).toBe(false);
    expect(state.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Failed to load scope' }),
    );
  });

  it('adds an entry from the builder rows, skipping incomplete rows', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    const builder = wrapper.findComponent({ name: 'LabelConditionBuilder' });
    builder.vm.$emit('update:modelValue', [
      { key: ' repo ', value: ' b ' },
      { key: 'env', value: '' },
    ]);
    await flushPromises();
    await wrapper.find('[data-testid="scope-add-entry"]').trigger('click');
    await flushPromises();

    expect(state.post).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/scope/entries',
      { labels: [{ key: 'repo', value: 'b' }] },
      { transformRequest: [state.decamelizeKeys] },
    );
  });

  it('removes an entry by posting an exception after confirmation', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    action(wrapper, 'Remove from scope').onSelect!();
    expect(state.confirmRequire).toHaveBeenCalledTimes(1);
    const options = state.confirmRequire.mock.calls[0][0];
    expect(options.message).toContain('templates will not learn it again');

    await options.accept();
    await flushPromises();

    expect(state.post).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/scope/exceptions',
      { labels: scope.entries[0].labels },
      { transformRequest: [state.decamelizeKeys] },
    );
    expect(state.delete).not.toHaveBeenCalled();
  });

  it("shows the API's message when removing would empty a followed scope", async () => {
    state.post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { errors: { body: '2 filters follow this scope' } },
      },
    });
    const wrapper = mountPanel();
    await flushPromises();

    action(wrapper, 'Remove from scope').onSelect!();
    await state.confirmRequire.mock.calls[0][0].accept();
    await flushPromises();

    expect(state.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: '2 filters follow this scope',
      }),
    );
  });

  it('deletes an exception', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    action(wrapper, 'Delete exception').onSelect!();
    await flushPromises();

    expect(state.delete).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/scope/exceptions/x-1',
    );
  });

  it('turns automatic filters on, off by default', async () => {
    const wrapper = mountPanel();
    await flushPromises();

    const toggle = wrapper.find('[data-testid="scope-auto-filters"] input');
    expect((toggle.element as HTMLInputElement).checked).toBe(false);

    await toggle.setValue(true);
    await flushPromises();

    expect(state.put).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/scope',
      { autoFilters: true },
      { transformRequest: [state.decamelizeKeys] },
    );
  });

  it('disables every write without SSP update permission', async () => {
    state.can.mockReturnValue(false);
    const wrapper = mountPanel();
    await flushPromises();

    // Unavailable controls stay focusable and say why (aria-disabled), as everywhere.
    expect(
      wrapper
        .find('[data-testid="scope-auto-filters"] input')
        .attributes('aria-disabled'),
    ).toBe('true');
    expect(
      wrapper
        .find('[data-testid="scope-add-entry"]')
        .attributes('aria-disabled'),
    ).toBe('true');
    expect(action(wrapper, 'Remove from scope').disabledReason).toBeDefined();
    expect(action(wrapper, 'Delete exception').disabledReason).toBeDefined();
  });
});
