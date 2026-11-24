import { afterEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import Drawer from '../components/Drawer/Drawer.vue';

const global = {
  stubs: {
    Tooltip: { template: '<slot />' },
    RouterLink: { props: ['to'], template: '<a v-bind="$attrs"><slot /></a>' },
  },
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Drawer', () => {
  it('titles a record with what it shows, its ID as code, and a link to it in a new tab', async () => {
    mount(Drawer, {
      props: {
        open: true,
        title: 'Account Management',
        titlePrefix: 'Implementation of',
        titleCode: 'ac-2',
        titleLink: {
          to: { name: 'catalog' },
          label: 'See ac-2 in its catalog (opens in a new tab)',
        },
      },
      slots: { default: '<p>Body</p>' },
      global,
      attachTo: document.body,
    });
    await flushPromises();
    const title = document.querySelector('[data-overlay-title]')!;
    expect(title.textContent).toBe('Implementation of ac-2 Account Management');
    expect(title.querySelector('code')?.textContent).toBe('ac-2');
    const link = document.querySelector(
      'a[aria-label="See ac-2 in its catalog (opens in a new tab)"]',
    );
    expect(link?.getAttribute('target')).toBe('_blank');
    // No rule under the header until the body scrolls.
    expect(
      document
        .querySelector('.modal__header')!
        .classList.contains('modal__header--ruled'),
    ).toBe(false);
  });
});
