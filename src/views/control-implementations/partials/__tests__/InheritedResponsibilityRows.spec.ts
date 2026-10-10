import { describe, expect, it } from 'vitest';
import { computed, ref } from 'vue';
import { mount } from '@vue/test-utils';
import InheritedResponsibilityRows from '../InheritedResponsibilityRows.vue';
import {
  LeveragedControlsKey,
  linkKey,
  type LeveragedControlsContext,
} from '@/composables/useLeveragedControls';
import type {
  LeveragedControl,
  ResponsibilityFilter,
} from '@/types/ssp-leverage';
import type { Statement } from '@/oscal';

const stubs = {
  Badge: {
    props: ['severity'],
    template: '<span :data-severity="severity"><slot /></span>',
  },
  DashboardEvidenceCounter: {
    props: ['dashboardId'],
    template: '<span data-testid="counter" :data-dashboard-id="dashboardId" />',
  },
};

function makeLink(overrides: Partial<LeveragedControl> = {}): LeveragedControl {
  return {
    id: 'link-1',
    controlId: 'AC-2',
    statementId: 'AC-2_smt.a',
    inheritedFrom: {
      upstreamSspId: 'ssp-up',
      offeringId: 'off-1',
      offeringTitle: 'Platform Baseline',
      offeringVersion: 3,
    },
    providedUuid: 'p-1',
    byComponentId: 'bc-1',
    satisfaction: 'partial',
    status: 'active',
    outstandingResponsibilities: [
      { responsibilityUuid: 'r-1', description: 'Rotate your own keys' },
    ],
    responsibilityPosture: { 'r-1': 'not-satisfied' },
    ...overrides,
  };
}

function makeContext(
  links: LeveragedControl[],
  filters: ResponsibilityFilter[] = [],
): LeveragedControlsContext {
  const map = new Map<string, LeveragedControl[]>();
  for (const link of links) {
    const key = linkKey(link.controlId, link.statementId);
    map.set(key, [...(map.get(key) ?? []), link]);
  }
  const filterMap = new Map<string, ResponsibilityFilter[]>();
  for (const filter of filters) {
    filterMap.set(filter.responsibilityUuid, [
      ...(filterMap.get(filter.responsibilityUuid) ?? []),
      filter,
    ]);
  }
  return {
    controls: ref(links),
    controlsLoading: ref(false),
    controlsError: ref(null),
    responsibilityFilters: ref(filters),
    responsibilityFiltersError: ref(null),
    linksByStatement: computed(() => map),
    filtersByResponsibility: computed(() => filterMap),
    refresh: async () => {},
  } as unknown as LeveragedControlsContext;
}

function mountRows(
  context: LeveragedControlsContext | null,
  statement?: Statement,
) {
  return mount(InheritedResponsibilityRows, {
    props: {
      // The card passes the catalog's casing; the join must not care.
      controlId: 'ac-2',
      statementId: 'ac-2_smt.a',
      statement,
    },
    global: {
      stubs,
      provide: context ? { [LeveragedControlsKey as symbol]: context } : {},
    },
  });
}

describe('InheritedResponsibilityRows', () => {
  it('renders nothing without a provided leveraged-controls context', () => {
    const wrapper = mountRows(null);
    expect(wrapper.text()).toBe('');
  });

  it('renders nothing when the statement has no leverage links', () => {
    const wrapper = mountRows(
      makeContext([makeLink({ controlId: 'cm-5', statementId: 'cm-5_smt' })]),
    );
    expect(wrapper.text()).toBe('');
  });

  it('renders the link header, satisfaction and per-responsibility posture rows', () => {
    const wrapper = mountRows(makeContext([makeLink()]));
    const text = wrapper.text();

    expect(text).toContain('Inherited from Platform Baseline v3');
    expect(text).toContain('Action needed');
    expect(text).toContain('Not covered');
    expect(text).toContain('Rotate your own keys');
    expect(text).not.toContain('Needs review');
  });

  it('flags drift and shows the handled check for satisfied entries', () => {
    const statement = {
      uuid: 'stmt-1',
      statementId: 'ac-2_smt.a',
      byComponents: [
        {
          uuid: 'bc-1',
          componentUuid: 'comp-1',
          description: 'x',
          satisfied: [
            {
              uuid: 's-1',
              responsibilityUuid: 'r-1',
              description: 'We rotate keys monthly',
            },
          ],
        },
      ],
    } as Statement;
    const wrapper = mountRows(
      makeContext([makeLink({ status: 'drifted', satisfaction: 'full' })]),
      statement,
    );

    expect(wrapper.text()).toContain('Needs review');
    expect(wrapper.text()).toContain('Implemented');
    expect(wrapper.text()).toContain('✓ handled');
  });

  it('renders one evidence counter per attached filter', () => {
    const wrapper = mountRows(
      makeContext(
        [makeLink()],
        [
          {
            responsibilityUuid: 'r-1',
            filterId: 'f-1',
            filterName: 'MFA checks',
            controlLinkCreated: true,
          },
          {
            responsibilityUuid: 'r-1',
            filterId: 'f-2',
            filterName: 'Key rotation',
            controlLinkCreated: false,
          },
        ],
      ),
    );

    const counters = wrapper.findAll('[data-testid="counter"]');
    expect(counters.map((c) => c.attributes('data-dashboard-id'))).toEqual([
      'f-1',
      'f-2',
    ]);
    // The evidence counters replace the posture badge once a dashboard is linked.
    expect(wrapper.text()).not.toContain('Not covered');
  });

  it('emits select when the block is clicked (the drawer shortcut)', async () => {
    const wrapper = mountRows(makeContext([makeLink()]));
    await wrapper.find('.cursor-pointer').trigger('click');
    expect(wrapper.emitted('select')).toHaveLength(1);
  });
});
