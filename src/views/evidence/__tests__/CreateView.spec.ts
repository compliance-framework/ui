import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import { AxiosHeaders } from 'axios';
import CreateView from '../CreateView.vue';

const { createConfig, executeMock, pushMock } = vi.hoisted(() => ({
  createConfig: { value: undefined as unknown },
  executeMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock('@/composables/axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables/axios')>();
  return {
    decamelizeKeys: actual.decamelizeKeys,
    useDataApi: (_url: string, config: unknown) => {
      createConfig.value = config;
      return { data: ref({ id: 'created-1' }), execute: executeMock };
    },
  };
});

vi.mock('@/router', () => ({ default: { push: pushMock } }));

// What the API receives: the request data run through the request transform.
function sentBody() {
  const config = createConfig.value as {
    transformRequest: ((data: unknown, headers: AxiosHeaders) => string)[];
  };
  const [{ data }] = executeMock.mock.calls[0]!;
  return JSON.parse(config.transformRequest[0]!(data, new AxiosHeaders()));
}

describe('Evidence CreateView', () => {
  beforeEach(() => {
    executeMock.mockReset();
    pushMock.mockReset();
  });

  it('sends the picked subjects as subjects[].subject-uuid', async () => {
    const wrapper = mount(CreateView, {
      global: {
        stubs: {
          PageHeader: { template: '<h1><slot /></h1>' },
          PageSubHeader: { template: '<h2><slot /></h2>' },
          EvidenceForm: {
            emits: ['submit'],
            template: `<button @click="$emit('submit', { title: 'Backups' }, [], { state: 'satisfied' }, [{ subjectUuid: 's-1' }])" />`,
          },
        },
      },
    });

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(sentBody().subjects).toEqual([{ 'subject-uuid': 's-1' }]);
    expect(pushMock).toHaveBeenCalledWith({
      name: 'evidence:view',
      params: { id: 'created-1' },
    });
  });
});
