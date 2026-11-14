import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import SystemImplementationSection from '../SystemImplementationSection.vue';

const api = vi.hoisted(() => ({ put: vi.fn() }));
vi.mock('@/composables/axios', () => ({
  useDataApi: () => ({
    data: ref({
      remarks: 'Runs on the shared cluster',
      props: [{ name: 'tier', value: 'gold' }],
      links: [{ href: 'https://runbook.example', text: 'Runbook' }],
      users: [{ uuid: 'u-1' }],
      components: [{ uuid: 'c-1' }, { uuid: 'c-2' }],
    }),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => api,
  decamelizeKeys: (data: unknown) => JSON.stringify(data),
}));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: vi.fn() }) }));

async function mountSection() {
  const Stub = { render: () => null };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/systems/:systemId/configure/i', component: Stub },
      {
        path: '/systems/:systemId/configure/users',
        name: 'system-configure-users',
        component: Stub,
      },
      {
        path: '/systems/:systemId/configure/components',
        name: 'system-configure-components',
        component: Stub,
      },
    ],
  });
  await router.push('/systems/s-1/configure/i');
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(SystemImplementationSection, { sspId: 'ssp-1' }),
        ),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return wrapper;
}

describe('SystemImplementationSection', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    api.put
      .mockReset()
      .mockImplementation((_url, body) =>
        Promise.resolve({ data: { data: body } }),
      );
  });

  it('shows remarks, properties, links and linked counts', async () => {
    const wrapper = await mountSection();
    const text = wrapper.text();
    expect(text).toContain('Runs on the shared cluster');
    expect(text).toContain('tier: gold');
    expect(wrapper.find('a[href="https://runbook.example"]').text()).toBe(
      'Runbook',
    );
    expect(
      wrapper.find('a[href="/systems/s-1/configure/components"]').text(),
    ).toBe('2 components');
    wrapper.unmount();
  });

  it('saves edited remarks, keeping users and components', async () => {
    const wrapper = await mountSection();
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Edit')!
      .click();
    await flushPromises();
    const remarks = document.querySelector<HTMLTextAreaElement>(
      '[role="dialog"] textarea',
    )!;
    remarks.value = 'Moved to the new cluster';
    remarks.dispatchEvent(new Event('input'));
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Save')!
      .click();
    await flushPromises();
    expect(api.put).toHaveBeenCalledWith(
      '/api/oscal/system-security-plans/ssp-1/system-implementation',
      expect.objectContaining({
        remarks: 'Moved to the new cluster',
        users: [{ uuid: 'u-1' }],
        props: [{ name: 'tier', value: 'gold' }],
      }),
      expect.anything(),
    );
    expect(wrapper.text()).toContain('Moved to the new cluster');
    wrapper.unmount();
  });
});
