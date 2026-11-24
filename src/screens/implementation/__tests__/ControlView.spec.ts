import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import type { Control, ImplementedRequirement } from '@/oscal';
import Clause from '@/ds/components/Clause/Clause.vue';
import ControlView from '../ControlView.vue';
import { provideControlTree, type ControlTreeContext } from '../controlTree';

vi.mock('@/screens/EvidenceCapsule.vue', () => ({
  default: { template: '<span />' },
}));
vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({}),
  decamelizeKeys: (x: unknown) => x,
}));
vi.mock('@/ds/toasts', () => ({ useToast: () => ({ add: vi.fn() }) }));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  RouterLink: { template: '<a><slot /></a>' },
}));

const control = {
  id: 'ac-2',
  title: 'Account Management',
  parts: [
    {
      id: 'ac-2_smt',
      name: 'statement',
      parts: [
        { id: 'ac-2_smt.a', name: 'item', prose: 'Define account types;' },
        { id: 'ac-2_smt.b', name: 'item', prose: 'Assign managers;' },
      ],
    },
  ],
} as Control;

const implementation = {
  uuid: 'req-1',
  controlId: 'ac-2',
  statements: [
    {
      uuid: 's-a',
      statementId: 'ac-2_smt.a',
      byComponents: [
        {
          uuid: 'bc-a',
          componentUuid: 'okta',
          description: 'Account types are Okta groups.',
          implementationStatus: { state: 'implemented' },
        },
      ],
    },
  ],
} as unknown as ImplementedRequirement;

function mountView(requirement = implementation) {
  const context = {
    sspId: () => 'ssp-1',
    implementation: () => requirement,
    component: () => ({ title: 'Okta' }),
    filters: () => [{ id: 'f1', name: 'MFA enforced', filter: {} }],
    allFilters: () => [],
    reloadFilters: vi.fn(async () => undefined),
    filterEditDenied: () => undefined,
    newFilterLink: () => ({ name: 'dashboards.create' }),
    suggestionCount: () => 0,
    components: () => [],
    editDenied: () => undefined,
    reload: vi.fn(async () => undefined),
    catalogLink: () => ({ name: 'catalog-view', params: { id: 'cat-1' } }),
  } as unknown as ControlTreeContext;
  const Host = defineComponent({
    setup() {
      provideControlTree(context);
      return () => h(ControlView, { control, open: true });
    },
  });
  return mount(Host, {
    global: {
      stubs: {
        Drawer: {
          props: ['title', 'titlePrefix', 'titleCode', 'titleLink'],
          template:
            '<div><h2>{{ titlePrefix }} <code>{{ titleCode }}</code> {{ title }}</h2><a v-if="titleLink">{{ titleLink.label }}</a><slot /></div>',
        },
        RouterLink: { template: '<a><slot /></a>' },
        Tooltip: { template: '<slot />' },
      },
    },
  });
}

describe('ControlView', () => {
  it('sets each clause of the statement out with what implements it', () => {
    const clauses = mountView().findAllComponents(Clause);
    expect(clauses.map((clause) => clause.text())).toEqual([
      expect.stringMatching(
        /Define account types;.*Okta.*Implemented.*Account types are Okta groups\./,
      ),
      expect.stringMatching(
        /Assign managers;.*Nothing written for this part yet\./,
      ),
    ]);
    expect(clauses.map((clause) => clause.props('hint'))).toEqual([
      'ac-2_smt.a',
      'ac-2_smt.b',
    ]);
  });

  it('links to the catalog once, and edits each clause with a pencil one line tall', () => {
    const wrapper = mountView();
    expect(wrapper.get('h2').text()).toBe(
      'Implementation of ac-2 Account Management',
    );
    expect(
      wrapper.findAll('a').filter((a) => a.text().includes('in its catalog')),
    ).toHaveLength(1);
    expect(wrapper.text()).not.toContain('By component');
    const pencils = wrapper.findAll('.clause__annotation .icon-button');
    expect(pencils).toHaveLength(2);
    for (const pencil of pencils)
      expect(pencil.classes()).toContain('icon-button--inline');
  });

  it("lists the control's evidence filters", () => {
    expect(mountView().text()).toContain('MFA enforced');
  });

  it('shows no implementation block for a statement that does not require implementation', () => {
    const wrapper = mountView({
      ...implementation,
      statements: [
        ...implementation.statements!,
        {
          uuid: 's-b',
          statementId: 'ac-2_smt.b',
          props: [
            {
              ns: 'https://compliance-framework.github.io/ns/oscal',
              name: 'implementation-required',
              value: 'false',
            },
          ],
        },
      ],
    });
    const clauses = wrapper.findAllComponents(Clause);
    expect(clauses[0]!.find('.clause__annotation').exists()).toBe(true);
    expect(clauses[1]!.find('.clause__annotation').exists()).toBe(false);
    expect(wrapper.findAll('button[aria-label^="Actions for"]')).toHaveLength(
      2,
    );
  });
});
