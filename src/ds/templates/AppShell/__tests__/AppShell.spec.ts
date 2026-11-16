import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, onMounted } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import {
  useSystemStore,
  type PartialSystemSecurityPlan,
} from '@/stores/system';
import AppShell from '../AppShell.vue';

// The shell loads the systems for its switcher; both test systems exist.
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({
    get: () =>
      Promise.resolve({
        data: {
          data: ['ssp-1', 'ssp-2'].map((uuid) => ({
            uuid,
            metadata: { title: uuid },
          })),
        },
      }),
  }),
}));

// The shell picks its navigation mode from the width; jsdom has no matchMedia.
vi.stubGlobal(
  'matchMedia',
  vi.fn(() => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
);

// Each test's shell must go: the system store syncs through localStorage, so a shell left
// mounted would react to the next test's switches too.
enableAutoUnmount(afterEach);

let pageMounts = 0;
const CountingPage = defineComponent({
  setup() {
    onMounted(() => (pageMounts += 1));
    return () => h('div', { class: 'page' });
  },
});

function plan(uuid: string): PartialSystemSecurityPlan {
  return { uuid, metadata: { title: uuid } } as PartialSystemSecurityPlan;
}

async function mountShell(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: AppShell,
        children: [
          { path: '', name: 'home', component: CountingPage },
          {
            path: 'page',
            component: CountingPage,
            meta: { activeSystemScoped: true },
          },
          { path: 'global', component: CountingPage },
          { path: 'new', component: CountingPage, meta: { ds: true } },
          { path: 'systems', name: 'systems', component: CountingPage },
          { path: 'preferences', name: 'preferences', component: CountingPage },
          { path: 'logout', name: 'logout', component: CountingPage },
        ],
      },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(
    { template: '<RouterView />' },
    { global: { plugins: [router] } },
  );
  await flushPromises();
  return wrapper;
}

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    pageMounts = 0;
  });

  it('renders the page inside the shell', async () => {
    const wrapper = await mountShell('/new');
    expect(wrapper.find('main .page').exists()).toBe(true);
  });

  it('keeps the page mounted while the current system stays the same', async () => {
    const systemStore = useSystemStore();
    systemStore.setSecurityPlan(plan('ssp-1'));
    await mountShell('/page');

    systemStore.setSecurityPlan({
      uuid: 'ssp-1',
      metadata: { title: 'Renamed' },
    } as PartialSystemSecurityPlan);
    await flushPromises();
    expect(pageMounts).toBe(1);
  });

  it('leaves a global page alone when the current system changes', async () => {
    const systemStore = useSystemStore();
    systemStore.setSecurityPlan(plan('ssp-1'));
    await mountShell('/global');

    systemStore.setSecurityPlan(plan('ssp-2'));
    await flushPromises();
    expect(pageMounts).toBe(1);
  });
});
