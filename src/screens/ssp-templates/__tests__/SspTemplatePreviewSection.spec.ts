import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import type { SspTemplate } from '@/types/ssp-templates';
import SspTemplatePreviewSection from '../SspTemplatePreviewSection.vue';

const state = vi.hoisted(() => ({
  post: vi.fn(),
  result: undefined as unknown,
  decamelizeKeys: vi.fn(),
}));
vi.mock('@/composables/axios', () => ({
  decamelizeKeys: state.decamelizeKeys,
  useAuthenticatedInstance: () => ({ post: state.post }),
}));

const template: SspTemplate = {
  id: 't-1',
  name: 'Apps',
  enabled: true,
  keys: ['_app'],
  filter: null,
  scopeLabels: [['repo']],
  minStreams: 2,
  titleTemplate: 'SSP for {{ ._app }}',
  props: null,
  profileIds: ['p-1'],
  createdAt: '2026-10-19T10:00:00Z',
  updatedAt: '2026-10-19T10:00:00Z',
};

function mountSection() {
  return mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(SspTemplatePreviewSection, { template }),
        ),
    }),
  );
}

describe('SspTemplatePreviewSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.result = {
      ssps: [
        {
          keyValues: { _app: 'payments' },
          title: 'SSP for payments',
          exists: false,
          streams: 12,
          learn: [
            [{ key: '_app', value: 'payments' }],
            [{ key: 'repo', value: 'a' }],
          ],
          skippedByException: [[{ key: 'repo', value: 'oops' }]],
        },
        {
          keyValues: { _app: 'billing' },
          title: 'SSP for billing',
          exists: true,
          streams: 3,
          learn: [],
        },
      ],
      belowThreshold: [{ keyValues: { _app: 'test' }, streams: 1 }],
      missingKeys: 37,
      invalid: [{ keyValues: { _app: 'x' }, reason: 'too long' }],
    };
    state.post.mockImplementation(async () => {
      if (state.result instanceof Error) throw state.result;
      return { data: { data: state.result } };
    });
  });

  it('posts the saved template kebab-cased on demand, keeping label keys in the response', async () => {
    const wrapper = mountSection();
    expect(state.post).not.toHaveBeenCalled();
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const [url, body, config] = state.post.mock.calls[0]!;
    expect(url).toBe('/api/admin/ssp-templates/preview');
    expect(config).toMatchObject({
      transformRequest: [state.decamelizeKeys],
      camelcaseStopPaths: [
        'data.ssps.key-values',
        'data.below-threshold.key-values',
        'data.invalid.key-values',
      ],
    });
    expect(body).toMatchObject({ name: 'Apps', keys: ['_app'], minStreams: 2 });
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('createdAt');
  });

  it('shows systems to create, entries to learn and skip, and the leftovers', async () => {
    const wrapper = mountSection();
    await wrapper.find('button').trigger('click');
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain(
      '1 system to create, 1 already created. 37 matching streams lack a key label.',
    );
    expect(text).toContain('SSP for payments');
    expect(text).toContain('New');
    expect(text).toContain('_app=payments · 12 streams');
    expect(text).toContain('Learn: repo=a');
    expect(text).toContain('Skipped by exception: repo=oops');
    expect(text).toContain('Exists');
    expect(text).toContain('_app=test: 1 stream');
    expect(text).toContain('_app=x: too long');
  });

  it('shows why a preview failed', async () => {
    state.result = new Error('filter is invalid');
    const wrapper = mountSection();
    await wrapper.find('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('filter is invalid');
    expect(wrapper.text()).not.toContain('SSP for payments');
  });
});
