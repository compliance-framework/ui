import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useSidebarStore } from '@/stores/sidebar';
import LeftSideNav from '../LeftSideNav.vue';

describe('LeftSideNav', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders admin links in correct order', () => {
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

    const systemUsersIndex = linkTexts.indexOf('System Users');
    const agentsIndex = linkTexts.indexOf('Agents');
    const diagnosticsIndex = linkTexts.indexOf('Diagnostics');
    const subjectTemplatesIndex = linkTexts.indexOf('Subject Templates');
    const riskTemplatesIndex = linkTexts.indexOf('Risk Templates');
    const importIndex = linkTexts.indexOf('Import');

    for (const index of [
      systemUsersIndex,
      agentsIndex,
      diagnosticsIndex,
      subjectTemplatesIndex,
      riskTemplatesIndex,
      importIndex,
    ]) {
      expect(index).toBeGreaterThanOrEqual(0);
    }

    expect(agentsIndex).toBeGreaterThan(systemUsersIndex);
    expect(subjectTemplatesIndex).toBeGreaterThan(agentsIndex);
    expect(riskTemplatesIndex).toBeGreaterThan(subjectTemplatesIndex);
    expect(diagnosticsIndex).toBeGreaterThan(riskTemplatesIndex);
    expect(importIndex).toBeGreaterThan(diagnosticsIndex);
  });

  it('groups Risks, Catalogs, Control Links, Profiles and Compliance Map under Governance, with Filters under Admin', () => {
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
    const governanceCategory = categories.find(
      (category) => category.find('.category-title').text() === 'Governance',
    );
    const adminCategory = categories.find(
      (category) => category.find('.category-title').text() === 'Admin',
    );

    expect(governanceCategory).toBeTruthy();
    for (const label of [
      'Risks',
      'Catalogs',
      'Control Links',
      'Profiles',
      'Compliance Map',
    ]) {
      expect(governanceCategory?.text()).toContain(label);
      expect(adminCategory?.text()).not.toContain(label);
    }

    // Filters live under Admin, not Governance.
    expect(adminCategory?.text()).toContain('Filters');
    expect(governanceCategory?.text()).not.toContain('Filters');

    // Dashboards and Lineage are no longer standalone top-level links.
    const topLevelLinks = wrapper
      .findAll('.sidenav-link')
      .map((link) => link.text().trim());
    expect(topLevelLinks).not.toContain('Dashboards');
    expect(topLevelLinks).not.toContain('Lineage');
  });

  it('exposes import only from the admin navigation category', () => {
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

    expect(adminCategory?.text()).toContain('Import');
    expect(
      categories
        .filter(
          (category) => category.find('.category-title').text() !== 'Admin',
        )
        .some((category) => category.text().includes('Import')),
    ).toBe(false);
  });
});
