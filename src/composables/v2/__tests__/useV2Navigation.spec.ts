import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { useV2Navigation } from '../useV2Navigation';
import { navigationItems } from '@/config/navigation';

const can = vi.fn(
  (resource: string, action: string) =>
    !(resource === 'admin' && action === 'manage'),
);
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ can }),
}));

// Every nav target plus the detail routes used below.
const Empty = defineComponent({ render: () => h('div') });
const navNames = navigationItems
  .flatMap((item) => item.children ?? [item])
  .map((item) => item.name!);
const pathFor: Record<string, string> = {
  'system:overview': '/system',
  'system-security-plans': '/system-security-plans',
  'workflow:index': '/workflows',
  'workflow-instances:index': '/workflow-instances',
};

async function setup(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      ...navNames.map((name) => ({
        name,
        path: pathFor[name] ?? `/${name.replace(/[:.]/g, '-')}`,
        component: Empty,
      })),
      { path: '/workflow-definitions/:id', component: Empty },
      { path: '/system-security-plans/:id', component: Empty },
    ],
  });
  await router.push(path);
  let nav!: ReturnType<typeof useV2Navigation>;
  mount(
    defineComponent({
      setup() {
        nav = useV2Navigation();
        return () => h('div');
      },
    }),
    { global: { plugins: [router] } },
  );
  return nav;
}

describe('useV2Navigation', () => {
  it('groups items into labelled sections with continuous numbering', async () => {
    const nav = await setup('/system');
    const labels = nav.navSections.value.map((section) => section.label);

    expect(labels).toEqual([
      'Systems',
      'Workspace',
      'Workflows',
      'Control Definitions',
      'Admin',
    ]);
    const indexes = nav.navItems.value.map((item) => item.index);
    expect(indexes[0]).toBe('01');
    expect(indexes).toEqual(
      indexes.map((_, i) => String(i + 1).padStart(2, '0')),
    );
  });

  it('hides items the user may not open, and empty sections', async () => {
    const nav = await setup('/system');
    const admin = nav.navSections.value.find((s) => s.label === 'Admin');

    // Only Agents has a non-admin permission in the Admin group.
    expect(admin?.items.map((item) => item.label)).toEqual(['Agents']);
  });

  it('marks workflow definitions active on a definition detail page', async () => {
    const nav = await setup('/workflow-definitions/wd-1');
    const active = nav.navItems.value.filter((item) => nav.isActive(item));

    expect(active.map((item) => item.label)).toEqual(['Workflow Definitions']);
  });

  it("doesn't confuse /system with /system-security-plans", async () => {
    const nav = await setup('/system-security-plans/ssp-1');
    const active = nav.navItems.value.filter((item) => nav.isActive(item));

    expect(active.map((item) => item.label)).toEqual(['Manage Systems']);
  });
});
