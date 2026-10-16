import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, onMounted } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import {
  useSystemStore,
  type PartialSystemSecurityPlan,
} from '@/stores/system';
import AppLayout from '../App.vue';

// Each test's layout must go: the system store syncs through localStorage, so a layout
// left mounted would react to the next test's switches too.
enableAutoUnmount(afterEach);

let pageMounts = 0;
const CountingPage = defineComponent({
  setup() {
    onMounted(() => {
      pageMounts += 1;
    });
    return () => h('div', { class: 'page' });
  },
});

function plan(uuid: string): PartialSystemSecurityPlan {
  return { uuid, metadata: { title: uuid } } as PartialSystemSecurityPlan;
}

async function mountLayout(path = '/page') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/',
        component: AppLayout,
        children: [
          {
            path: 'page',
            component: CountingPage,
            meta: { activeSystemScoped: true },
          },
          { path: 'global', component: CountingPage },
        ],
      },
    ],
  });
  await router.push(path);
  await router.isReady();

  return mount(
    { template: '<RouterView />' },
    {
      global: {
        plugins: [router],
        stubs: {
          LeftSideNav: true,
          SidebarToggle: true,
          ProfileDropdown: true,
          ActiveSystemSelector: true,
        },
      },
    },
  );
}

describe('App layout', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    pageMounts = 0;
  });

  it('remounts a This System page when the active system changes', async () => {
    const systemStore = useSystemStore();
    systemStore.setSecurityPlan(plan('ssp-1'));

    const wrapper = await mountLayout();
    expect(wrapper.find('.page').exists()).toBe(true);
    expect(pageMounts).toBe(1);

    systemStore.setSecurityPlan(plan('ssp-2'));
    await flushPromises();

    expect(pageMounts).toBe(2);
  });

  it('keeps the page mounted while the active system stays the same', async () => {
    const systemStore = useSystemStore();
    systemStore.setSecurityPlan(plan('ssp-1'));

    await mountLayout();
    // Same system with a refreshed title (as setAvailablePlans does).
    systemStore.setSecurityPlan({
      uuid: 'ssp-1',
      metadata: { title: 'Renamed' },
    } as PartialSystemSecurityPlan);
    await flushPromises();

    expect(pageMounts).toBe(1);
  });

  it('leaves a global page alone when the active system changes', async () => {
    const systemStore = useSystemStore();
    systemStore.setSecurityPlan(plan('ssp-1'));

    const wrapper = await mountLayout('/global');
    expect(wrapper.find('.page').exists()).toBe(true);

    systemStore.setSecurityPlan(plan('ssp-2'));
    await flushPromises();

    expect(pageMounts).toBe(1);
  });
});
