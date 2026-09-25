import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import { useSidebarStore } from '@/stores/sidebar';
import LeftSideNav from '../LeftSideNav.vue';
import SideNavCategory from '@/components/navigation/SideNavCategory.vue';
import SideNavLink from '@/components/navigation/SideNavLink.vue';

// Every route name referenced by LeftSideNav.vue's nav config, plus two routes that are
// never registered as nav items anywhere but share a URL prefix with one that is
// ('catalog-create'/'catalog-view', siblings of 'catalog-list' under /catalogs) — the
// "New Catalog" button and a catalog detail deep link. A real router is used (rather than
// mocking vue-router) so route.matched/route.path changes on navigation are genuinely
// reactive, exercising LeftSideNav's active-section tracking end to end.
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
];

function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      ...routeNames.map((name) => ({
        // 'catalog-list' mirrors the real router's /catalogs path, since the whole point
        // of the tests below is exercising the path-prefix relationship with its siblings.
        path:
          name === 'catalog-list' ? '/catalogs' : `/${name.replace(':', '-')}`,
        name,
        component: { template: '<div />' },
      })),
      // Flat siblings of 'catalog-list', not themselves nav items — matches the real
      // router's shape (/catalogs, /catalogs/:id, /catalogs/new).
      {
        path: '/catalogs/new',
        name: 'catalog-create',
        component: { template: '<div />' },
      },
      {
        path: '/catalogs/:id',
        name: 'catalog-view',
        component: { template: '<div />' },
      },
    ],
  });
}

function mountNav(router: ReturnType<typeof createTestRouter>) {
  const sidebarStore = useSidebarStore();
  sidebarStore.open = true;

  return mount(LeftSideNav, {
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
}

describe('LeftSideNav active-section persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Category open/closed state now persists to real localStorage (leftNavCategories
    // store), which outlives a fresh Pinia instance — clear it so tests stay isolated.
    localStorage.clear();
  });

  it('resolves the active section from the URL alone on a fresh load (hard refresh / deep link)', async () => {
    // 'catalog-list' (the nav item) has path /catalogs; 'catalog-view' (a detail page,
    // never itself a nav item) has path /catalogs/:id — simulating loading
    // http://localhost/catalogs/<uuid> directly, with no prior in-app navigation to
    // inherit state from.
    const router = createTestRouter();
    await router.push({ name: 'catalog-view', params: { id: 'some-uuid' } });
    await router.isReady();

    const wrapper = mountNav(router);

    const controlDefinitionsCategory = wrapper
      .findAllComponents(SideNavCategory)
      .find((category) => category.props('title') === 'Control Definitions');
    const catalogsLink = wrapper
      .findAllComponents(SideNavLink)
      .find(
        (link) =>
          (link.props('to') as { name?: string } | undefined)?.name ===
          'catalog-list',
      );

    expect(controlDefinitionsCategory?.props('active')).toBe(true);
    expect(controlDefinitionsCategory?.props('open')).toBe(true);
    expect(catalogsLink?.props('active')).toBe(true);
  });

  it('keeps the previous section highlighted through an unlisted route, and only switches once a genuinely different section is reached', async () => {
    const router = createTestRouter();
    await router.push({ name: 'catalog-list' }); // a child of Control Definitions
    await router.isReady();

    const wrapper = mountNav(router);

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
