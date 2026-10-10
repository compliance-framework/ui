import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import { AxiosHeaders } from 'axios';
import UpdateView from '../UpdateView.vue';

const { createConfig, executeMock, pushMock } = vi.hoisted(() => ({
  createConfig: { value: undefined as unknown },
  executeMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'evidence-1' } }),
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('@/composables/axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables/axios')>();
  return {
    decamelizeKeys: actual.decamelizeKeys,
    useDataApi: (url: string, config: unknown) => {
      if (url === '/api/evidence') {
        createConfig.value = config;
        return { data: ref({ id: 'created-2' }), execute: executeMock };
      }
      // The evidence being re-submitted, with a subject declared on the previous revision.
      return {
        data: ref({
          id: 'evidence-1',
          uuid: 'stream-1',
          title: 'Backups',
          subjects: [{ type: 'component', description: 'old' }],
          subjectReferences: [{ subjectUuid: 's-old', type: 'party' }],
        }),
        isLoading: ref(false),
      };
    },
  };
});

// What the API receives: the request data run through the request transform.
function sentBody() {
  const config = createConfig.value as {
    transformRequest: ((data: unknown, headers: AxiosHeaders) => string)[];
  };
  const [{ data }] = executeMock.mock.calls[0]!;
  return JSON.parse(config.transformRequest[0]!(data, new AxiosHeaders()));
}

describe('Evidence UpdateView', () => {
  beforeEach(() => {
    executeMock.mockReset();
    pushMock.mockReset();
  });

  it("sends the picked subjects in place of the previous revision's", async () => {
    const wrapper = mount(UpdateView, {
      global: {
        stubs: {
          PageHeader: { template: '<h1><slot /></h1>' },
          PageSubHeader: { template: '<h2><slot /></h2>' },
          EvidenceForm: {
            props: ['evidence'],
            emits: ['submit'],
            template: `<button @click="$emit('submit', evidence, [], { state: 'satisfied' }, [{ subjectUuid: 's-1' }])" />`,
          },
        },
      },
    });

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(sentBody().subjects).toEqual([{ 'subject-uuid': 's-1' }]);
    expect(pushMock).toHaveBeenCalledWith({
      name: 'evidence:view',
      params: { id: 'created-2' },
    });
  });
});
