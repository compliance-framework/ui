import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import type { CatalogOffering } from '@/types/ssp-export-offerings';
import SubscribeOfferingForm from '../SubscribeOfferingForm.vue';

const state = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ post: state.post }),
}));
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() }),
}));

// `responsibilities` is loose on purpose: the API sends `null` for a Go nil slice.
function makeOffering(responsibilities: unknown): CatalogOffering {
  return {
    id: 'off-1',
    sspId: 'ssp-up',
    title: 'Platform Baseline',
    description: '',
    version: 1,
    status: 'published',
    contentHash: '',
    createdAt: '',
    updatedAt: '',
    items: [
      {
        id: 'item-1',
        offeringId: 'off-1',
        controlId: 'AC-2',
        statementId: 'AC-2_smt.a',
        componentUuid: 'c',
        providedUuid: 'p-1',
        responsibilities: responsibilities as never,
      },
      {
        id: 'item-2',
        offeringId: 'off-1',
        controlId: 'AC-3',
        componentUuid: 'c',
        providedUuid: 'p-2',
      },
    ],
  };
}

function mountForm(
  props: Partial<InstanceType<typeof SubscribeOfferingForm>['$props']>,
) {
  const events: Record<string, unknown[]> = {};
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(SubscribeOfferingForm, {
            sspId: 'ssp-down',
            offering: makeOffering(null),
            ...props,
            onSubscribed: (p: unknown) => (events.subscribed = [p]),
            onCancel: () => (events.cancel = []),
          }),
        ),
    }),
  );
  return { wrapper, events };
}

describe('SubscribeOfferingForm', () => {
  beforeEach(() => {
    state.post.mockReset();
    state.post.mockResolvedValue({
      data: { data: [{ id: 'link-1' }], meta: { created: {} } },
    });
  });

  // Preselection reaches the responsibilities on the first render, so a null must not throw.
  it('mounts a preselected item whose responsibilities came back as null', () => {
    const { wrapper } = mountForm({ preselectedItemIds: ['item-1'] });
    expect(wrapper.text()).toContain('AC-2 · Statement AC-2_smt.a');
    expect(wrapper.text()).not.toContain('Already handled');
  });

  it('lists the responsibilities of a chosen item', () => {
    const { wrapper } = mountForm({
      offering: makeOffering([
        { responsibilityUuid: 'r-1', description: 'Rotate your own keys' },
      ]),
      preselectedItemIds: ['item-1'],
    });
    expect(wrapper.text()).toContain(
      'Already handled for AC-2 · Statement AC-2_smt.a',
    );
    expect(wrapper.text()).toContain('Rotate your own keys');
  });

  it('shows only the scoped items', () => {
    const { wrapper } = mountForm({ scopedItemIds: ['item-2'] });
    expect(wrapper.text()).toContain('AC-3');
    expect(wrapper.text()).not.toContain('AC-2');
  });

  it('asks for an item before subscribing', async () => {
    const { wrapper } = mountForm({});
    await wrapper.find('form').trigger('submit');
    expect(wrapper.text()).toContain('Choose at least one item to inherit.');
    expect(state.post).not.toHaveBeenCalled();
  });

  it('subscribes with the chosen items and the responsibilities already met', async () => {
    const { wrapper, events } = mountForm({
      offering: makeOffering([
        { responsibilityUuid: 'r-1', description: 'Rotate your own keys' },
      ]),
      preselectedItemIds: ['item-1'],
    });
    const box = wrapper
      .findAll('label')
      .find((l) => l.text() === 'Rotate your own keys')!;
    await wrapper.find(`input[id="${box.attributes('for')}"]`).setValue(true);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(state.post).toHaveBeenCalledWith(
      '/api/oscal/ssp-export-offerings/off-1/subscribe',
      {
        downstreamSspId: 'ssp-down',
        items: [{ itemId: 'item-1', satisfiedResponsibilityUuids: ['r-1'] }],
      },
    );
    expect(events.subscribed).toEqual([
      { links: [{ id: 'link-1' }], meta: { created: {} } },
    ]);
  });

  it('shows a failed subscribe in the form', async () => {
    state.post.mockRejectedValueOnce({
      response: { status: 409, data: { errors: { body: 'Already linked' } } },
    });
    const { wrapper } = mountForm({ preselectedItemIds: ['item-2'] });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Already linked');
  });
});
