import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import { useSidebarStore } from '@/stores/sidebar';
import LeftSideNav from '../LeftSideNav.vue';
import SideNavCategory from '@/components/navigation/SideNavCategory.vue';
import SideNavLink from '@/components/navigation/SideNavLink.vue';

// Every route name referenced by LeftSideNav.vue's nav config, plus one detail route
// that is never registered as a nav item anywhere (the "unlisted page a button pushes
// to" scenario). A real router is used (rather than mocking vue-router) so route.matched
// changes on navigation are genuinely reactive, exercising LeftSideNav's sticky
// active-section tracking end to end instead of hand-simulating reactivity.
const routeNames = [
  'admin-agents',
  'admin-diagnostics',
  'admin-groups',
  'admin-import',
  'admin-parties',
  'admin-risk-templates',
  'admin-risks',
  'admin-roles',
  'admin-subject-templates',
  'assessment-plans',
  'assessment-results',
  'catalog-list',
  'component-definitions',
  'control-links-list',
  'controls:index',
  'dashboards',
  'evidence:index',
  'inventory:index',
  'lineage',
  'logout',
  'plan-of-action-and-milestones',
  'profile-list',
  'risks:index',
  'system-security-plans',
  'system:overview',
  'users-list',
  'workflow-instances:index',
  'workflow:index',
  // Not a nav item anywhere — simulates a page an in-page button pushes to (e.g. the
  // real "New Catalog" creation page reached from a button on the catalogs list).
  'catalog-create',
];

function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: routeNames.map((name) => ({
      path: `/${name.replace(':', '-')}`,
      name,
      component: { template: '<div />' },
    })),
  });
}

describe('LeftSideNav active-section persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('keeps the previous section highlighted through an unlisted route, and only switches once a genuinely different section is reached', async () => {
    const router = createTestRouter();
    await router.push({ name: 'catalog-list' }); // a child of Control Definitions
    await router.isReady();

    const sidebarStore = useSidebarStore();
    sidebarStore.open = true;

    const wrapper = mount(LeftSideNav, {
      global: {
        plugins: [router],
        directives: {
          tooltip: {
            mounted: () => undefined,
          },
        },
        stubs: {
          SideNav: {
            template: '<div><slot name="logo" /><slot /></div>',
          },
          SideNavLogo: {
            template: '<img alt="logo" />',
          },
        },
      },
    });

    const findCategory = (title: string) =>
      wrapper
        .findAllComponents(SideNavCategory)
        .find((category) => category.props('title') === title);
    const findChildLink = (routeName: string) =>
      wrapper
        .findAllComponents(SideNavLink)
        .find(
          (link) =>
            (link.props('to') as { name?: string } | undefined)?.name ===
            routeName,
        );

    expect(findCategory('Control Definitions')?.props('active')).toBe(true);
    expect(findChildLink('catalog-list')?.props('active')).toBe(true);

    // An in-page button (e.g. "New Catalog") pushes to a route that was never
    // registered as a nav child anywhere, one level down from the list page.
    await router.push({ name: 'catalog-create' });
    await wrapper.vm.$nextTick();

    expect(findCategory('Control Definitions')?.props('active')).toBe(true);
    expect(findCategory('Control Definitions')?.props('open')).toBe(true);
    expect(findChildLink('catalog-list')?.props('active')).toBe(true);

    // Only a route that genuinely belongs to a different nav entry moves the highlight —
    // at either level.
    await router.push({ name: 'workflow:index' });
    await wrapper.vm.$nextTick();

    expect(findCategory('Control Definitions')?.props('active')).toBe(false);
    expect(findChildLink('catalog-list')?.props('active')).toBe(false);
    expect(findCategory('Workflows')?.props('active')).toBe(true);
  });
});
