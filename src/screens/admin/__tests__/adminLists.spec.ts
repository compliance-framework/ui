import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref, type Component } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { TooltipProvider } from 'reka-ui';
import UsersScreen from '../UsersScreen.vue';
import GroupsScreen from '../GroupsScreen.vue';
import PartiesScreen from '../PartiesScreen.vue';

const responses = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const post = vi.hoisted(() => vi.fn());

vi.mock('@/composables/axios', () => ({
  useDataApi: (url: string | null) => ({
    data: ref(url ? responses.value[url] : undefined),
    error: ref(undefined),
    isLoading: ref(false),
    isFinished: ref(true),
    execute: vi.fn(() => Promise.resolve()),
  }),
  useAuthenticatedInstance: () => ({ post }),
}));

vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));

async function mountScreen(screen: Component, path: string) {
  const Stub = defineComponent({ render: () => h('div') });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/users', component: screen },
      { path: '/admin/groups', component: screen },
      { path: '/parties', component: screen },
      { path: '/users/:id', name: 'user-view', component: Stub },
      { path: '/admin/groups/:id', name: 'admin-group-view', component: Stub },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(
    defineComponent({
      render: () => h(TooltipProvider, null, () => h(screen)),
    }),
    { global: { plugins: [router] }, attachTo: document.body },
  );
  await flushPromises();
  return { wrapper, router };
}

describe('admin lists', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    post.mockReset();
    document.body.innerHTML = '';
    responses.value = {
      '/api/admin/users': [
        {
          id: 'u1',
          email: 'zed@example.com',
          firstName: 'Zed',
          lastName: 'Ash',
          isLocked: true,
        },
        {
          id: 'u2',
          email: 'amy@example.com',
          firstName: 'Amy',
          lastName: 'Bell',
        },
      ],
      '/api/admin/groups': [
        { id: 'g1', name: 'Auditors', memberCount: 12 },
        {
          id: 'g2',
          name: 'Admins',
          description: 'Platform admins',
          memberCount: 2,
        },
      ],
      '/api/oscal/parties': [
        {
          uuid: 'p1',
          name: 'Meridian',
          shortName: 'MFG',
          type: 'organization',
        },
      ],
    };
  });

  it('lists users by name, tagging locked accounts, and searches name or email', async () => {
    const { wrapper } = await mountScreen(UsersScreen, '/users');
    const rows = wrapper.findAll('tbody tr').map((r) => r.text());
    expect(rows[0]).toContain('Amy Bell');
    expect(rows[1]).toContain('Locked');
    const searched = await mountScreen(UsersScreen, '/users?q=zed@');
    expect(searched.wrapper.findAll('tbody tr')).toHaveLength(1);
  });

  it('checks a new user before creating it', async () => {
    const { wrapper } = await mountScreen(UsersScreen, '/users');
    const newUser = wrapper
      .findAll('button')
      .find((b) => b.text() === 'New user')!;
    await newUser.trigger('click');
    await flushPromises();
    const form = document.body.querySelector('[role="dialog"] form')!;
    form.dispatchEvent(new Event('submit'));
    await flushPromises();
    expect(document.body.textContent).toContain('Enter a first name.');
    expect(post).not.toHaveBeenCalled();
  });

  it('sorts groups by member count numerically', async () => {
    const { wrapper } = await mountScreen(
      GroupsScreen,
      '/admin/groups?sort=members&dir=descending',
    );
    expect(wrapper.findAll('tbody a').map((a) => a.text())).toEqual([
      'Auditors',
      'Admins',
    ]);
  });

  it('shows parties with their short name and type', async () => {
    const { wrapper } = await mountScreen(PartiesScreen, '/parties');
    expect(wrapper.find('tbody').text()).toContain('Meridian (MFG)');
    expect(wrapper.find('tbody').text()).toContain('organization');
  });
});
