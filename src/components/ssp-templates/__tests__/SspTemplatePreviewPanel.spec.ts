import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import SspTemplatePreviewPanel from '../SspTemplatePreviewPanel.vue';
import type { SspTemplate } from '@/types/ssp-templates';

const state = vi.hoisted(() => ({
  url: undefined as unknown,
  config: undefined as Record<string, unknown> | undefined,
  execute: vi.fn(),
  result: undefined as unknown,
  decamelizeKeys: vi.fn(),
}));

vi.mock('@/composables/axios', () => ({
  decamelizeKeys: state.decamelizeKeys,
  useDataApi: (url: unknown, config: Record<string, unknown>) => {
    state.url = url;
    state.config = config;
    const data = ref<unknown>(undefined);
    state.execute.mockImplementation(async () => {
      if (state.result instanceof Error) {
        throw state.result;
      }
      data.value = state.result;
    });
    return { data, isLoading: ref(false), execute: state.execute };
  },
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

describe('SspTemplatePreviewPanel', () => {
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
  });

  it('posts the saved template kebab-cased, keeping label keys in the response', async () => {
    const wrapper = mount(SspTemplatePreviewPanel, { props: { template } });
    expect(state.execute).not.toHaveBeenCalled();

    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(state.url).toBe('/api/admin/ssp-templates/preview');
    expect(state.config).toMatchObject({
      method: 'POST',
      transformRequest: [state.decamelizeKeys],
      camelcaseStopPaths: [
        'data.ssps.key-values',
        'data.below-threshold.key-values',
        'data.invalid.key-values',
      ],
    });
    const body = state.execute.mock.calls[0][0].data;
    expect(body).toMatchObject({ name: 'Apps', keys: ['_app'], minStreams: 2 });
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('createdAt');
  });

  it('shows SSPs to create, entries to learn and skip, and the leftovers', async () => {
    const wrapper = mount(SspTemplatePreviewPanel, { props: { template } });
    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="preview-counts"]').text()).toMatch(
      /1 SSP\(s\) to create, 1 already\s+created\. 37 matching/,
    );
    const ssps = wrapper.findAll('[data-testid="preview-ssp"]');
    expect(ssps).toHaveLength(2);
    expect(ssps[0].text()).toContain('SSP for payments');
    expect(ssps[0].text()).toContain('New');
    expect(ssps[0].text()).toContain('_app=payments · 12 stream(s)');
    expect(ssps[0].text()).toContain('Learn: repo=a');
    expect(ssps[0].text()).toContain('Skipped by exception: repo=oops');
    expect(ssps[1].text()).toContain('Exists');
    expect(
      wrapper.find('[data-testid="preview-below-threshold"]').text(),
    ).toMatch(/_app=test: 1\s+stream\(s\)/);
    expect(wrapper.find('[data-testid="preview-invalid"]').text()).toBe(
      '_app=x: too long',
    );
  });

  it('shows why a preview failed', async () => {
    state.result = new Error('filter is invalid');
    const wrapper = mount(SspTemplatePreviewPanel, { props: { template } });
    await wrapper.find('button').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('filter is invalid');
    expect(wrapper.find('[data-testid="preview-ssp"]').exists()).toBe(false);
  });
});
