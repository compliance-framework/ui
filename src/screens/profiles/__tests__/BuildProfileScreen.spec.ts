import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import BuildProfileScreen from '../BuildProfileScreen.vue';

const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref([{ uuid: 'cat-1', metadata: { title: 'NIST 800-53' } }]),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

async function mountScreen() {
  const Stub = { render: () => null };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profiles/build-props', component: BuildProfileScreen },
      { path: '/profiles', name: 'profile-list', component: Stub },
      { path: '/profiles/:id', name: 'profile:view', component: Stub },
    ],
  });
  await router.push('/profiles/build-props');
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(BuildProfileScreen)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return wrapper;
}

describe('BuildProfileScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    api.post.mockReset().mockResolvedValue({
      data: { data: { profileId: 'prof-9', controlIds: ['ac-1', 'ac-2'] } },
    });
  });

  it('builds a profile from the first catalog and the default rule, linking to the result', async () => {
    const wrapper = await mountScreen();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(api.post).toHaveBeenCalledWith(
      '/api/oscal/profiles/build-props',
      {
        catalogId: 'cat-1',
        matchStrategy: 'any',
        rules: [{ name: 'label', operator: 'contains', value: 'AC-' }],
        title: 'Prop-matched profile',
        version: '1.0.0',
      },
      expect.anything(),
    );
    expect(wrapper.text()).toContain('selecting 2 controls');
    expect(wrapper.find('a[href="/profiles/prof-9"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it('asks for a value on every rule before building', async () => {
    const wrapper = await mountScreen();
    const value = wrapper.findAll('input').at(-1)!;
    await value.setValue('');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('give every rule a value');
    expect(api.post).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
