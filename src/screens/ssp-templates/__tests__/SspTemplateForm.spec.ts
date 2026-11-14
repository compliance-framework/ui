import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { TooltipProvider } from 'reka-ui';
import type { SspTemplate } from '@/types/ssp-templates';
import SspTemplateForm from '../SspTemplateForm.vue';

const state = vi.hoisted(() => ({
  post: vi.fn<
    (url: string, body: unknown, config: unknown) => Promise<unknown>
  >(),
  put: vi.fn<
    (url: string, body: unknown, config: unknown) => Promise<unknown>
  >(),
  decamelizeKeys: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  decamelizeKeys: state.decamelizeKeys,
  useAuthenticatedInstance: () => ({ post: state.post, put: state.put }),
  useDataApi: () => ({
    data: ref([{ uuid: 'p-1', metadata: { title: 'NIST Moderate' } }]),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    response: ref(undefined),
    execute: vi.fn(() => Promise.resolve()),
  }),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

const saved: SspTemplate = {
  id: 't-1',
  name: 'Apps',
  enabled: true,
  keys: ['_app'],
  filter: null,
  scopeLabels: [['repo']],
  minStreams: 2,
  titleTemplate: 'SSP for {{ ._app }}',
  profileIds: ['p-1'],
  createdAt: '2026-10-19T10:00:00Z',
  updatedAt: '2026-10-19T10:00:00Z',
};

function mountForm(template: SspTemplate | null = null) {
  const events: unknown[] = [];
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(SspTemplateForm, {
            template,
            onSaved: (t: unknown) => events.push(t),
          }),
        ),
    }),
  );
  return { wrapper, events };
}

const field = (wrapper: ReturnType<typeof mount>, label: string) => {
  const el = wrapper
    .findAll('label')
    .find((l) => l.text().replace('*', '').trim() === label)!;
  return wrapper.find(`[id="${el.attributes('for')}"]`);
};

describe('SspTemplateForm', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    state.post.mockResolvedValue({ data: { data: saved } });
    state.put.mockResolvedValue({ data: { data: saved } });
  });

  it('creates a template with a kebab-case body', async () => {
    const { wrapper, events } = mountForm();
    await field(wrapper, 'Name').setValue('Apps');
    await field(wrapper, 'Key labels').setValue('_app, env');
    await field(wrapper, 'Title template').setValue('SSP for {{ ._app }}');
    await field(wrapper, 'Evidence filter').setValue('auto_create_ssp=true');
    await field(wrapper, 'NIST Moderate').setValue(true);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const [url, body, config] = state.post.mock.calls[0]!;
    expect(url).toBe('/api/admin/ssp-templates');
    expect(config).toEqual({ transformRequest: [state.decamelizeKeys] });
    expect(body).toEqual(
      expect.objectContaining({
        name: 'Apps',
        keys: ['_app', 'env'],
        filter: {
          scope: {
            condition: {
              label: 'auto_create_ssp',
              operator: '=',
              value: 'true',
            },
          },
        },
        profileIds: ['p-1'],
      }),
    );
    expect(events).toEqual([saved]);
  });

  it('edits a saved template, showing its keys as fixed text', async () => {
    const { wrapper } = mountForm(saved);
    expect(wrapper.text()).toContain('_app');
    expect(
      wrapper.findAll('input').some((i) => i.element.value === '_app'),
    ).toBe(false);
    expect(
      wrapper.findAll('input').some((i) => i.element.value === 'repo'),
    ).toBe(true);

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(state.put.mock.calls[0]![0]).toBe('/api/admin/ssp-templates/t-1');
    expect(state.put.mock.calls[0]![1]).toEqual(
      expect.objectContaining({
        keys: ['_app'],
        minStreams: 2,
        scopeLabels: [['repo']],
      }),
    );
  });

  it('explains an invalid filter and does not save', async () => {
    const { wrapper } = mountForm(saved);
    await field(wrapper, 'Evidence filter').setValue('a=b AND c=d OR e=f');
    expect(wrapper.text()).toContain('Filter is invalid');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(state.put).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Not saved');
  });

  it('shows the API error when saving fails', async () => {
    state.put.mockRejectedValue({
      response: {
        status: 400,
        data: { errors: { body: 'keys cannot change' } },
      },
    });
    const { wrapper, events } = mountForm(saved);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('keys cannot change');
    expect(events).toEqual([]);
  });

  it('names preview sample labels like the Go template placeholders', async () => {
    const { wrapper } = mountForm(saved);
    await wrapper
      .findAll('button[aria-expanded]')
      .find((b) => b.text().includes('Template preview'))!
      .trigger('click');
    expect(
      wrapper.findAll('input').some((i) => i.element.value === '._app'),
    ).toBe(true);
  });
});
