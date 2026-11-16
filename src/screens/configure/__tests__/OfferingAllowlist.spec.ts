import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { TooltipProvider } from 'reka-ui';
import Combobox from '@/ds/components/Combobox/Combobox.vue';
import OfferingAllowlist from '../OfferingAllowlist.vue';

const state = vi.hoisted(() => ({
  allowed: [] as unknown[],
  failAllowed: false,
  can: true,
  post: vi.fn(),
  del: vi.fn(),
}));
vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string) => {
    const isAllowed = url.endsWith('/allowed-downstreams');
    const failed = isAllowed && state.failAllowed;
    return {
      data: ref(
        failed
          ? undefined
          : isAllowed
            ? state.allowed
            : [
                { uuid: 'ssp-up', metadata: { title: 'Upstream' } },
                { uuid: 'ssp-a', metadata: { title: 'Payments' } },
                { uuid: 'ssp-b', metadata: { title: 'Billing' } },
              ],
      ),
      error: ref(failed ? { response: { status: 500 } } : undefined),
      isLoading: ref(false),
      isFinished: ref(true),
      response: ref(undefined),
      execute: vi.fn(() => Promise.resolve()),
    };
  },
  useAuthenticatedInstance: () => ({ post: state.post, delete: state.del }),
}));
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can: () => state.can }),
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

const URL =
  '/api/oscal/system-security-plans/ssp-up/export-offerings/o-1/allowed-downstreams';

function mountList() {
  return mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(OfferingAllowlist, { sspId: 'ssp-up', offeringId: 'o-1' }),
        ),
    }),
    { attachTo: document.body },
  );
}

describe('OfferingAllowlist', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    state.allowed = [];
    state.failAllowed = false;
    state.can = true;
    state.post.mockReset().mockResolvedValue({
      data: {
        data: { id: 'a-2', offeringId: 'o-1', downstreamSspId: 'ssp-b' },
      },
    });
    state.del.mockReset().mockResolvedValue({});
  });

  it('reads an empty allow-list as "any system may subscribe", but never after a failed load', async () => {
    let wrapper = mountList();
    await flushPromises();
    expect(wrapper.text()).toContain('Any system may subscribe');
    wrapper.unmount();
    state.failAllowed = true;
    wrapper = mountList();
    await flushPromises();
    expect(wrapper.text()).not.toContain('Any system may subscribe');
    expect(wrapper.text()).toMatch(/try again/i);
    wrapper.unmount();
  });

  it('lists allowed systems by title, offers the others but never its own, adds and removes', async () => {
    state.allowed = [
      { id: 'a-1', offeringId: 'o-1', downstreamSspId: 'ssp-a' },
    ];
    const wrapper = mountList();
    await flushPromises();
    expect(wrapper.text()).toContain('Payments');
    const picker = wrapper.findComponent(Combobox);
    expect(
      (picker.props('options') as { value: string }[]).map((o) => o.value),
    ).toEqual(['ssp-b']);
    picker.vm.$emit('update:modelValue', 'ssp-b');
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Allow'))!
      .trigger('click');
    await flushPromises();
    expect(state.post).toHaveBeenCalledWith(URL, { downstreamSspId: 'ssp-b' });
    await wrapper.find('button[aria-label="Remove Payments"]').trigger('click');
    await flushPromises();
    expect(state.del).toHaveBeenCalledWith(`${URL}/ssp-a`);
    wrapper.unmount();
  });

  it('disables allowing and removing without ssp:export', async () => {
    state.can = false;
    state.allowed = [
      { id: 'a-1', offeringId: 'o-1', downstreamSspId: 'ssp-a' },
    ];
    const wrapper = mountList();
    await flushPromises();
    expect(
      wrapper
        .find('button[aria-label="Remove Payments"]')
        .attributes('aria-disabled'),
    ).toBe('true');
    const allow = wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Allow'))!;
    expect(allow.attributes('aria-disabled')).toBe('true');
    wrapper.unmount();
  });
});
