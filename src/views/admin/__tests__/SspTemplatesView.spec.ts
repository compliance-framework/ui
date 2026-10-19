import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import SspTemplatesView from '../SspTemplatesView.vue';

const state = vi.hoisted(() => ({
  templates: [] as unknown[],
  load: vi.fn(),
  remove: vi.fn(),
  confirmRequire: vi.fn(),
  toastAdd: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string | null) => {
    if (url === '/api/admin/ssp-templates') {
      return {
        data: ref(state.templates),
        isLoading: ref(false),
        error: ref(null),
        execute: state.load,
      };
    }
    return { execute: state.remove };
  },
}));

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: state.confirmRequire }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: state.toastAdd }),
}));

const template = {
  id: 't-1',
  name: 'Applications by _app',
  enabled: true,
  keys: ['_app', 'env'],
  sspCount: 4,
  lastRunAt: '2026-10-19T10:00:00Z',
};

function mountView() {
  return mount(SspTemplatesView, {
    global: {
      stubs: {
        RouterLinkButton: {
          props: ['to'],
          template: '<a data-testid="view-link"><slot /></a>',
        },
      },
    },
  });
}

describe('SspTemplatesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.templates = [template, { id: 't-2', name: 'Other', keys: ['x'] }];
    state.remove.mockResolvedValue({});
    state.load.mockResolvedValue({});
  });

  it('lists name, keys, enabled, created SSP count and last run', () => {
    const rows = mountView().findAll('[data-testid="ssp-template-row"]');

    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Applications by _app');
    expect(rows[0].text()).toContain('_app');
    expect(rows[0].text()).toContain('env');
    expect(rows[0].text()).toContain('Yes');
    expect(rows[0].findAll('td')[3].text()).toBe('4');
    expect(rows[0].findAll('td')[4].text()).not.toBe('-');
    // Counts and run times the API does not return yet show as a dash.
    expect(rows[1].text()).toContain('No');
    expect(rows[1].findAll('td')[3].text()).toBe('-');
    expect(rows[1].findAll('td')[4].text()).toBe('-');
  });
  it('deletes a template after confirmation and reloads the list', async () => {
    const wrapper = mountView();
    const deleteButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Delete')!;
    await deleteButton.trigger('click');

    const options = state.confirmRequire.mock.calls[0][0];
    expect(options.message).toContain('are kept');
    await options.accept();
    await flushPromises();

    expect(state.remove).toHaveBeenCalledWith('/api/admin/ssp-templates/t-1');
    expect(state.load).toHaveBeenCalled();
    expect(state.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' }),
    );
  });

  it('reports a failed delete', async () => {
    state.remove.mockRejectedValue(new Error('boom'));
    const wrapper = mountView();
    const deleteButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Delete')!;
    await deleteButton.trigger('click');
    await state.confirmRequire.mock.calls[0][0].accept();
    await flushPromises();

    expect(state.load).not.toHaveBeenCalled();
    expect(state.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', summary: 'Delete Failed' }),
    );
  });
});
