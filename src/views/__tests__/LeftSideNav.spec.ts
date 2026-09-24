import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useSidebarStore } from '@/stores/sidebar';
import LeftSideNav from '../LeftSideNav.vue';
import SideNavCategory from '@/components/navigation/SideNavCategory.vue';

// A simple, non-reactive stand-in: fine for the initial-render check below, which mounts
// fresh per test. The sticky persistence-across-navigation behavior (LeftSideNav watching
// route.fullPath) needs a genuinely reactive route and is covered separately in
// LeftSideNavActiveSection.spec.ts using a real router.
const { mockRoute } = vi.hoisted(() => ({
  mockRoute: { matched: [] as Array<{ name?: string }> },
}));

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  RouterLink: {
    name: 'RouterLink',
    template: '<a><slot /></a>',
  },
}));

describe('LeftSideNav', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockRoute.matched = [];
  });

  it('no longer renders the retired admin links', () => {
    const sidebarStore = useSidebarStore();
    sidebarStore.open = true;

    const wrapper = mount(LeftSideNav, {
      global: {
        directives: {
          tooltip: {
            mounted: () => undefined,
          },
        },
        stubs: {
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
        },
      },
    });

    const linkTexts = wrapper
      .findAll('.sidenav-link')
      .map((link) => link.text().trim())
      .filter((text) => text.length > 0);

    for (const label of [
      'Subject Templates',
      'Risk Templates',
      'Component Definitions',
      'Parties',
      'Roles',
    ]) {
      expect(linkTexts).not.toContain(label);
    }
  });

  it('reinstates Groups, Agents, Diagnostics and Import in the navigation', () => {
    const sidebarStore = useSidebarStore();
    sidebarStore.open = true;

    const wrapper = mount(LeftSideNav, {
      global: {
        directives: {
          tooltip: {
            mounted: () => undefined,
          },
        },
        stubs: {
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
        },
      },
    });

    const linkTexts = wrapper
      .findAll('.sidenav-link')
      .map((link) => link.text().trim())
      .filter((text) => text.length > 0);

    for (const label of ['Groups', 'Agents', 'Diagnostics', 'Import']) {
      expect(linkTexts).toContain(label);
    }
  });

  it('groups Risks, Groups, Agents, Diagnostics and Import under a separate Admin category', () => {
    const sidebarStore = useSidebarStore();
    sidebarStore.open = true;

    const wrapper = mount(LeftSideNav, {
      global: {
        directives: {
          tooltip: {
            mounted: () => undefined,
          },
        },
        stubs: {
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
        },
      },
    });

    const categories = wrapper.findAll('section');
    const adminCategory = categories.find(
      (category) => category.find('.category-title').text() === 'Admin',
    );

    expect(adminCategory).toBeTruthy();
    for (const label of [
      'Risks',
      'Groups',
      'Agents',
      'Diagnostics',
      'Import',
    ]) {
      expect(adminCategory?.text()).toContain(label);
    }

    // Not nested under Admin — Control Definitions still owns these.
    expect(adminCategory?.text()).not.toContain('Catalogs');
    expect(adminCategory?.text()).not.toContain('Control Links');
  });

  it('groups Catalogs, Control Links and Profiles under Control Definitions, with Evidence Filters and Compliance Map as top-level links', () => {
    const sidebarStore = useSidebarStore();
    sidebarStore.open = true;

    const wrapper = mount(LeftSideNav, {
      global: {
        directives: {
          tooltip: {
            mounted: () => undefined,
          },
        },
        stubs: {
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
        },
      },
    });

    const categories = wrapper.findAll('section');
    const controlDefinitionsCategory = categories.find(
      (category) =>
        category.find('.category-title').text() === 'Control Definitions',
    );

    expect(controlDefinitionsCategory).toBeTruthy();

    for (const label of ['Catalogs', 'Control Links', 'Profiles']) {
      expect(controlDefinitionsCategory?.text()).toContain(label);
    }
    expect(controlDefinitionsCategory?.text()).not.toContain('Risks');
    expect(controlDefinitionsCategory?.text()).not.toContain(
      'Evidence Filters',
    );
    expect(controlDefinitionsCategory?.text()).not.toContain('Compliance Map');

    // Evidence Filters and Compliance Map are now standalone top-level links,
    // not nested under any category.
    const topLevelLinks = wrapper
      .findAll('.sidenav-link')
      .map((link) => link.text().trim());
    expect(topLevelLinks).toContain('Evidence Filters');
    expect(topLevelLinks).toContain('Compliance Map');

    // Dashboards is still not a standalone top-level link.
    expect(topLevelLinks).not.toContain('Dashboards');
  });

  it('groups Active System and Manage Systems under a Systems category', () => {
    const sidebarStore = useSidebarStore();
    sidebarStore.open = true;

    const wrapper = mount(LeftSideNav, {
      global: {
        directives: {
          tooltip: {
            mounted: () => undefined,
          },
        },
        stubs: {
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
        },
      },
    });

    const categories = wrapper.findAll('section');
    const systemsCategory = categories.find(
      (category) => category.find('.category-title').text() === 'Systems',
    );

    expect(systemsCategory).toBeTruthy();
    expect(systemsCategory?.text()).toContain('Active System');
    expect(systemsCategory?.text()).toContain('Manage Systems');
    expect(systemsCategory?.text()).not.toContain('System Security Plans');
  });

  it('puts Systems at the top, followed by Evidence, Controls, Compliance Map, Risk Register and Evidence Filters', () => {
    const sidebarStore = useSidebarStore();
    sidebarStore.open = true;

    const wrapper = mount(LeftSideNav, {
      global: {
        directives: {
          tooltip: {
            mounted: () => undefined,
          },
        },
        stubs: {
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
        },
      },
    });

    const orderedLabels = wrapper
      .findAll('.category-title, .sidenav-link')
      .map((el) => el.text().trim());
    const categoryTitles = wrapper
      .findAll('.category-title')
      .map((el) => el.text().trim());

    const indexOf = (label: string) => orderedLabels.indexOf(label);

    // Systems is the first top-level category, with its children rendered
    // immediately after it, followed by Evidence, Controls, Compliance Map,
    // Risk Register and Evidence Filters, in that order.
    expect(categoryTitles.at(0)).toBe('Systems');
    expect(orderedLabels.slice(0, 8)).toEqual([
      'Systems',
      'Active System',
      'Manage Systems',
      'Evidence',
      'Controls',
      'Compliance Map',
      'Risk Register',
      'Evidence Filters',
    ]);

    for (const label of ['Workflows', 'Control Definitions']) {
      expect(indexOf('Systems')).toBeLessThan(indexOf(label));
    }
  });

  it('highlights and opens the category containing the active route', () => {
    const sidebarStore = useSidebarStore();
    sidebarStore.open = true;
    // 'catalog-list' is a child of Control Definitions.
    mockRoute.matched = [{ name: 'catalog-list' }];

    const wrapper = mount(LeftSideNav, {
      global: {
        directives: {
          tooltip: {
            mounted: () => undefined,
          },
        },
        stubs: {
          SideNav: {
            template: '<div><slot name="logo" /><slot /></div>',
          },
          SideNavLink: {
            template: '<a class="sidenav-link"><slot /></a>',
          },
          SideNavLogo: {
            template: '<img alt="logo" />',
          },
        },
      },
    });

    const governanceCategory = wrapper
      .findAllComponents(SideNavCategory)
      .find((category) => category.props('title') === 'Control Definitions');
    const workflowsCategory = wrapper
      .findAllComponents(SideNavCategory)
      .find((category) => category.props('title') === 'Workflows');

    expect(governanceCategory?.props('active')).toBe(true);
    expect(governanceCategory?.props('open')).toBe(true);

    // A category that doesn't contain the active route is neither highlighted nor forced open.
    expect(workflowsCategory?.props('active')).toBe(false);
    expect(workflowsCategory?.props('open')).toBe(false);
  });
});
