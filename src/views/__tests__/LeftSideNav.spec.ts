import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useSidebarStore } from '@/stores/sidebar';
import LeftSideNav from '../LeftSideNav.vue';

describe('LeftSideNav', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders Subject Templates between System Users and Risk Templates', () => {
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
    const subjectTemplatesIndex = linkTexts.indexOf('Subject Templates');
    const riskTemplatesIndex = linkTexts.indexOf('Risk Templates');

    expect(systemUsersIndex).toBeGreaterThanOrEqual(0);
    expect(subjectTemplatesIndex).toBeGreaterThan(systemUsersIndex);
    expect(riskTemplatesIndex).toBeGreaterThan(subjectTemplatesIndex);
  });
});
