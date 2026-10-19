import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { Component } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useSidebarStore } from '@/stores/sidebar';
import { usePermissionsStore } from '@/stores/permissions';
import { useSystemStore } from '@/stores/system';
import LeftSideNav from '../LeftSideNav.vue';
import SideNavCategory from '@/components/navigation/SideNavCategory.vue';

// A simple, non-reactive stand-in: fine for the initial-render check below, which mounts
// fresh per test. The sticky/path-prefix persistence-across-navigation behavior
// (LeftSideNav watching route.fullPath and resolving nav item paths) needs a genuinely
// reactive route and router, and is covered separately in LeftSideNavActiveSection.spec.ts
// using a real router.
const { mockRoute } = vi.hoisted(() => ({
  mockRoute: { matched: [] as Array<{ name?: string }>, path: '/' },
}));

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({
    resolve: () => {
      throw new Error('not registered');
    },
  }),
  RouterLink: {
    name: 'RouterLink',
    template: '<a><slot /></a>',
  },
}));

// Category bodies render as <section>; the nav's own scope groups are role="group".
const categoryStubs = {
  SideNav: {
    template: '<div><slot name="logo" /><slot /></div>',
  },
  SideNavCategory: {
    template:
      '<section><div class="category-title"><slot name="title" /></div><div><slot /></div></section>',
  },
  SideNavLink: {
    template: '<a class="sidenav-link"><slot /></a>',
  },
  SideNavLogo: {
    template: '<img alt="logo" />',
  },
};

// Real SideNavCategory, for tests about its open/active state.
const realCategoryStubs = {
  SideNav: categoryStubs.SideNav,
  SideNavLink: categoryStubs.SideNavLink,
  SideNavLogo: categoryStubs.SideNavLogo,
};

const tooltip = { mounted: () => undefined };

function mountNav(stubs: Record<string, Component | boolean> = categoryStubs) {
  const sidebarStore = useSidebarStore();
  sidebarStore.open = true;
  return mount(LeftSideNav, {
    global: { directives: { tooltip }, stubs },
  });
}

function linkTexts(wrapper: ReturnType<typeof mountNav>) {
  return wrapper
    .findAll('.sidenav-link')
    .map((link) => link.text().trim())
    .filter((text) => text.length > 0);
}

function findCategory(wrapper: ReturnType<typeof mountNav>, title: string) {
  return wrapper
    .findAll('section')
    .find((category) => category.find('.category-title').text() === title);
}

describe('LeftSideNav', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockRoute.matched = [];
    mockRoute.path = '/';
    // Category open/closed state now persists to real localStorage (leftNavCategories
    // store), which outlives a fresh Pinia instance — clear it so tests stay isolated.
    localStorage.clear();
  });

  it('no longer renders the retired links', () => {
    const texts = linkTexts(mountNav());

    for (const label of [
      'Subject Templates',
      'Risk Templates',
      'Component Definitions',
      'Parties',
      'Roles',
      // Folded into the header's Active System menu / renamed in the menu reorg.
      'Active System',
      'Manage Systems',
      'Controls',
      'Risk Register',
      'System Users',
    ]) {
      expect(texts).not.toContain(label);
    }
  });

  it('splits the nav into a This System section followed by a Global section', () => {
    const wrapper = mountNav();
    const groups = wrapper.findAll('[role="group"]');

    expect(groups.map((group) => group.attributes('aria-label'))).toEqual([
      'This System',
      'Global',
    ]);
    expect(groups[0].text()).toContain('This System');
    expect(groups[1].text()).toContain('Global');
  });

  it('lists the system-scoped pages, in order, under This System', () => {
    const wrapper = mountNav();
    const thisSystem = wrapper.find('[aria-label="This System"]');
    const labels = thisSystem
      .findAll('.sidenav-link')
      .map((link) => link.text().trim());

    expect(labels).toEqual([
      'Evidence',
      'Implementation',
      'Compliance',
      'Risks',
      'Workflow Instances',
      'Configure System',
    ]);
  });

  it('names the active system under the This System heading', () => {
    const systemStore = useSystemStore();
    systemStore.setSecurityPlan({
      uuid: 'ssp-1',
      metadata: { title: 'Payments Platform' },
    } as never);

    const thisSystem = mountNav().find('[aria-label="This System"]');
    expect(thisSystem.text()).toContain('Payments Platform');
  });

  it('says when no system is selected', () => {
    const thisSystem = mountNav().find('[aria-label="This System"]');
    expect(thisSystem.text()).toContain('No system selected');
  });

  it('groups the Global pages into Analysis, Integrations, Control Definitions and Admin', () => {
    const wrapper = mountNav();
    const global = wrapper.find('[aria-label="Global"]');

    expect(
      global.findAll('.category-title').map((title) => title.text().trim()),
    ).toEqual(['Analysis', 'Integrations', 'Control Definitions', 'Admin']);

    const expectations: Record<string, string[]> = {
      Analysis: ['Risks', 'Compliance Map'],
      Integrations: [
        'Workflow Definitions',
        'Evidence Filters',
        'Agents',
        'Import',
      ],
      'Control Definitions': ['Catalogs', 'Profiles', 'Control Links'],
      Admin: ['Users', 'Groups', 'Diagnostics'],
    };

    for (const [category, children] of Object.entries(expectations)) {
      const labels = findCategory(wrapper, category)!
        .findAll('.sidenav-link')
        .map((link) => link.text().trim());
      expect(labels).toEqual(children);
    }
  });

  it('highlights and opens the category containing the active route', () => {
    // 'catalog-list' is a child of Control Definitions.
    mockRoute.matched = [{ name: 'catalog-list' }];

    const wrapper = mountNav(realCategoryStubs);
    const category = (title: string) =>
      wrapper
        .findAllComponents(SideNavCategory)
        .find((item) => item.props('title') === title);

    expect(category('Control Definitions')?.props('active')).toBe(true);
    expect(category('Control Definitions')?.props('open')).toBe(true);

    // A category that doesn't contain the active route is neither highlighted nor forced open.
    expect(category('Integrations')?.props('active')).toBe(false);
    expect(category('Integrations')?.props('open')).toBe(false);
  });

  it('keeps a manually opened category open across a hard refresh, even with nothing under it selected', async () => {
    mockRoute.matched = []; // nothing active anywhere

    const findIntegrations = (wrapper: ReturnType<typeof mountNav>) =>
      wrapper
        .findAllComponents(SideNavCategory)
        .find((category) => category.props('title') === 'Integrations')!;

    const wrapper = mountNav(realCategoryStubs);
    expect(findIntegrations(wrapper).find('div.mb-2').classes()).toContain(
      'hidden',
    );

    await findIntegrations(wrapper).find('div').trigger('click');
    expect(findIntegrations(wrapper).find('div.mb-2').classes()).not.toContain(
      'hidden',
    );

    // Simulate a hard refresh: a brand-new Pinia instance (so the store itself is rebuilt
    // from scratch, not just re-read from memory) backed by the same localStorage, exactly
    // as a real browser reload would leave it.
    setActivePinia(createPinia());
    const wrapperAfterRefresh = mountNav(realCategoryStubs);
    expect(
      findIntegrations(wrapperAfterRefresh).find('div.mb-2').classes(),
    ).not.toContain('hidden');
  });

  it('shows Agents (but not Groups) to a non-admin with agent:read (R40)', () => {
    const permissions = usePermissionsStore();
    permissions.permissions = { agent: ['read'], admin: [] };
    permissions.loaded = true;

    const texts = linkTexts(mountNav());
    expect(texts).toContain('Agents');
    expect(texts).not.toContain('Groups');
    // Analysis > Risks is admin-only; Compliance Map keeps the category visible.
    expect(texts).toContain('Compliance Map');
  });
});
