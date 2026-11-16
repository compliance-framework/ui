import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import type { POAMItem } from '@/oscal';
import PoamItemForm from '../PoamItemForm.vue';

const api = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

const mountForm = (item?: POAMItem) =>
  mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(PoamItemForm, { poamId: 'p-1', item }),
        ),
    }),
  );

describe('PoamItemForm', () => {
  beforeEach(() => {
    api.post.mockReset().mockResolvedValue({ data: { data: { uuid: 'new' } } });
    api.put.mockReset().mockResolvedValue({ data: { data: { uuid: 'i-1' } } });
  });

  it('requires a title and description, then adds the item', async () => {
    const wrapper = mountForm();
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Enter a title.');
    await wrapper.find('input').setValue('MFA gap');
    await wrapper.findAll('textarea')[0]!.setValue('Admins lack MFA');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.post.mock.calls[0]![0]).toBe(
      '/api/oscal/plan-of-action-and-milestones/p-1/poam-items',
    );
    expect(api.post.mock.calls[0]![1]).toMatchObject({
      title: 'MFA gap',
      description: 'Admins lack MFA',
    });
    expect(wrapper.findComponent(PoamItemForm).emitted('created')).toHaveLength(
      1,
    );
  });

  it('keeps the links to findings, observations and risks when editing', async () => {
    const wrapper = mountForm({
      uuid: 'i-1',
      title: 'MFA gap',
      description: 'Admins lack MFA',
      relatedRisks: [{ riskUuid: 'r-1' }],
    });
    await wrapper.find('input').setValue('MFA gap (admins)');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.put.mock.calls[0]![0]).toBe(
      '/api/oscal/plan-of-action-and-milestones/p-1/poam-items/i-1',
    );
    expect(api.put.mock.calls[0]![1]).toMatchObject({
      title: 'MFA gap (admins)',
      relatedRisks: [{ riskUuid: 'r-1' }],
    });
    expect(wrapper.findComponent(PoamItemForm).emitted('saved')).toHaveLength(
      1,
    );
  });
});
