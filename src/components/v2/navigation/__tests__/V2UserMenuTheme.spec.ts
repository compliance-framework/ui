import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import V2UserMenu from '../V2UserMenu.vue';

enableAutoUnmount(afterEach);

const theme = ref<'light' | 'dark'>('light');
const toggleTheme = vi.fn(() => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
});

vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({ theme, toggleTheme }),
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ post: vi.fn() }),
}));
vi.mock('@/stores/auth', () => ({
  useUserStore: () => ({
    user: { firstName: 'Local', lastName: 'Admin', email: 'admin@example.com' },
    logout: vi.fn(),
  }),
}));
vi.mock('@/composables/workflows/useMyAssignments', () => ({
  useMyAssignments: () => ({ getAssignmentCount: vi.fn(async () => 0) }),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('V2 user menu dark mode', () => {
  it('toggles dark mode and reflects its state', async () => {
    const wrapper = mount(V2UserMenu, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    });
    await flushPromises();
    await wrapper.find('button').trigger('click');

    const item = wrapper.find('[role="menuitemcheckbox"]');
    expect(item.text()).toContain('Dark mode');
    expect(item.attributes('aria-checked')).toBe('false');

    await item.trigger('click');
    expect(toggleTheme).toHaveBeenCalledTimes(1);
    expect(item.attributes('aria-checked')).toBe('true');
    expect(item.text()).toContain('On');
  });
});
