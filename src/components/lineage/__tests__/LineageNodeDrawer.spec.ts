import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import LineageNodeDrawer from '../LineageNodeDrawer.vue';
import type {
  LineageLeverageRow,
  LineageNode,
} from '@/composables/useLineage/types';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock('@/composables/axios', () => ({
  useAuthenticatedInstance: () => ({ get: getMock }),
}));

function controlNode(over: Partial<LineageNode> = {}): LineageNode {
  return {
    key: 'control:cat/AC-2',
    nodeType: 'control',
    controlId: 'AC-2',
    title: 'Manage accounts',
    compliance: {
      totalControls: 1,
      satisfied: 0,
      notSatisfied: 0,
      unknown: 0,
      compliancePercent: 100,
      assessedPercent: 100,
    },
    risk: {
      openScoreSum: 0,
      mutedScoreSum: 0,
      counts: {
        open: 0,
        investigating: 0,
        mitigatingPlanned: 0,
        riskAccepted: 0,
        mitigatingImplemented: 0,
      },
    },
    linkage: {
      policies: 0,
      procedures: 0,
      operationalControls: 0,
      unmapped: false,
      unanchored: false,
    },
    hasChildren: false,
    childrenCount: 0,
    ...over,
  };
}

function leverageRow(
  over: Partial<LineageLeverageRow> = {},
): LineageLeverageRow {
  return {
    sspId: 'ssp-down',
    sspTitle: 'Downstream SSP',
    links: [
      {
        id: 'link-1',
        controlId: 'AC-2',
        statementId: 'ac-2_smt.a',
        inheritedFrom: {
          upstreamSspId: 'ssp-up',
          upstreamSspTitle: 'Platform SSP',
          offeringId: 'off-1',
          offeringTitle: 'Managed Postgres',
          offeringVersion: 2,
        },
        providedUuid: 'p-1',
        byComponentId: 'bc-1',
        satisfaction: 'partial',
        status: 'drifted',
        responsibilities: [
          { responsibilityUuid: 'r-1', description: 'Rotate your own keys' },
        ],
        outstandingResponsibilities: [
          { responsibilityUuid: 'r-1', description: 'Rotate your own keys' },
        ],
        responsibilityPosture: { 'r-1': 'not-satisfied' },
      },
    ],
    ...over,
  };
}

const global = {
  directives: { tooltip: {} },
  stubs: {
    Drawer: { props: ['visible', 'header'], template: '<div><slot /></div>' },
    Badge: {
      props: ['severity'],
      template: '<span :data-severity="severity"><slot /></span>',
    },
    RiskHeatBadge: { template: '<span />' },
  },
};

function mountDrawer(props: Record<string, unknown>) {
  return mount(LineageNodeDrawer, {
    props: { node: controlNode(), visible: true, ...props },
    global,
  });
}

describe('LineageNodeDrawer — inherited capabilities', () => {
  beforeEach(() => {
    getMock.mockReset();
    // Default: evidence + ssps empty; leverage returns one row.
    getMock.mockImplementation((url: string) => {
      if (url.includes('/leverage')) {
        return Promise.resolve({ data: { data: [leverageRow()] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('fetches /leverage for a control node fencing the UUID-keyed posture map', async () => {
    mountDrawer({});
    await flushPromises();

    const call = getMock.mock.calls.find((c) =>
      String(c[0]).includes('/leverage'),
    );
    expect(call).toBeTruthy();
    expect(call![0]).toBe('/api/lineage/nodes/control%3Acat%2FAC-2/leverage');
    expect(call![1]).toEqual({
      camelcaseStopPaths: ['data.links.responsibilityPosture'],
    });
  });

  it('renders the SSP, offering, satisfaction and per-responsibility posture', async () => {
    const wrapper = mountDrawer({});
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('Downstream SSP');
    expect(text).toContain('Managed Postgres · v2');
    expect(text).toContain('From Platform SSP');
    expect(text).toContain('Rotate your own keys');
    // satisfactionLabel('partial') and the drifted leverage badge.
    expect(text).toContain('Action needed');
    expect(text).toContain('Inherited · drifted');
    // postureLabel('not-satisfied').
    expect(text).toContain('Not covered');
  });

  it('shows the empty state when no downstream SSP inherits the control', async () => {
    getMock.mockImplementation((url: string) => {
      if (url.includes('/leverage')) {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
    const wrapper = mountDrawer({});
    await flushPromises();
    expect(wrapper.text()).toContain(
      'No inherited capabilities for this control.',
    );
  });

  it('skips the fetch in fixtures mode', async () => {
    const wrapper = mountDrawer({ usingFixtures: true });
    await flushPromises();

    expect(
      getMock.mock.calls.some((c) => String(c[0]).includes('/leverage')),
    ).toBe(false);
    expect(wrapper.text()).toContain(
      'Inherited capabilities are available when connected to the API.',
    );
  });

  it('drops a stale response when the node switches mid-flight', async () => {
    let resolveAlpha: (() => void) | undefined;
    let resolveBeta: (() => void) | undefined;

    getMock.mockImplementation((url: string) => {
      if (url.includes('/leverage')) {
        if (url.includes('AC-2')) {
          return new Promise((resolve) => {
            resolveAlpha = () =>
              resolve({
                data: { data: [leverageRow({ sspTitle: 'SSP Alpha' })] },
              });
          });
        }
        if (url.includes('AC-3')) {
          return new Promise((resolve) => {
            resolveBeta = () =>
              resolve({
                data: { data: [leverageRow({ sspTitle: 'SSP Beta' })] },
              });
          });
        }
      }
      return Promise.resolve({ data: { data: [] } });
    });

    const wrapper = mountDrawer({});
    await wrapper.setProps({
      node: controlNode({ key: 'control:cat/AC-3', controlId: 'AC-3' }),
    });

    // Resolve the CURRENT node (Beta) first, then the stale one (Alpha).
    resolveBeta?.();
    await flushPromises();
    resolveAlpha?.();
    await flushPromises();

    expect(wrapper.text()).toContain('SSP Beta');
    expect(wrapper.text()).not.toContain('SSP Alpha');
  });
});
