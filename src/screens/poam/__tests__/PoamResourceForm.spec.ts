import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import type { BackMatterResource } from '@/oscal';
import PoamResourceForm from '../PoamResourceForm.vue';

const api = vi.hoisted(() => ({
  put: vi.fn(() => Promise.resolve({ data: { data: { uuid: 'r-1' } } })),
  post: vi.fn(),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));

describe('PoamResourceForm', () => {
  it('edits a resource, keeping its embedded file and leaving out empty parts', async () => {
    const resource: BackMatterResource = {
      uuid: 'r-1',
      title: 'Evidence pack',
      base64: { filename: 'pack.zip', value: 'UEsDBA==' },
    };
    const wrapper = mount(
      defineComponent({
        render: () =>
          h(TooltipProvider, null, () =>
            h(PoamResourceForm, { poamId: 'p-1', resource }),
          ),
      }),
    );
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const [url, body] = api.put.mock.calls[0] as unknown as [
      string,
      BackMatterResource,
    ];
    expect(url).toBe(
      '/api/oscal/plan-of-action-and-milestones/p-1/back-matter/resources/r-1',
    );
    expect(body.base64).toEqual(resource.base64);
    expect(body.citation).toBeUndefined();
    expect(body.rlinks).toBeUndefined();
    expect(
      wrapper.findComponent(PoamResourceForm).emitted('saved'),
    ).toHaveLength(1);
  });
});
