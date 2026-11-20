import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import type { Control, ImplementedRequirement } from '@/oscal';
import Clause from '@/ds/components/Clause/Clause.vue';
import ControlView from '../ControlView.vue';
import { provideControlTree, type ControlTreeContext } from '../controlTree';

vi.mock(
  '@/views/control-implementations/partials/ControlEvidenceCounter.vue',
  () => ({ default: { template: '<span />' } }),
);
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

function mountView() {
  const context = {
    sspId: () => 'ssp-1',
    implementation: () => implementation,
    component: () => ({ title: 'Okta' }),
    filters: () => [{ id: 'f1', name: 'MFA enforced', filter: {} }],
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
        Drawer: { template: '<div><slot /></div>' },
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

  it('links to the catalog once, and says "By component" only over components', () => {
    const wrapper = mountView();
    expect(
      wrapper.findAll('a').filter((a) => a.text().includes('in its catalog')),
    ).toHaveLength(1);
    const labels = wrapper
      .findAll('.clause__annotation')
      .map((note) => note.text().includes('By component'));
    expect(labels).toEqual([true, false]);
  });

  it("lists the control's evidence filters", () => {
    expect(mountView().text()).toContain('MFA enforced');
  });
});
