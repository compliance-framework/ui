import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ComplianceProgressPanel from '../ComplianceProgressPanel.vue';
import type {
  ProfileComplianceControl,
  ProfileComplianceControlLeverage,
  ProfileComplianceSummary,
} from '@/types/compliance';

function summary(
  over: Partial<ProfileComplianceSummary> = {},
): ProfileComplianceSummary {
  return {
    totalControls: 10,
    satisfied: 4,
    notSatisfied: 2,
    unknown: 2,
    inherited: 2,
    compliancePercent: 60,
    assessedPercent: 80,
    implementedControls: 5,
    ...over,
  };
}

function leverage(
  over: Partial<ProfileComplianceControlLeverage> = {},
): ProfileComplianceControlLeverage {
  return {
    inherited: true,
    satisfaction: 'full',
    status: 'active',
    links: 1,
    outstandingCount: 1,
    totalResponsibilities: 3,
    inheritedFrom: [
      {
        upstreamSspId: 'ssp-up',
        upstreamSspTitle: 'Platform SSP',
        offeringId: 'off-1',
        offeringTitle: 'Managed Postgres',
        offeringVersion: 2,
      },
    ],
    ...over,
  };
}

function control(
  over: Partial<ProfileComplianceControl> = {},
): ProfileComplianceControl {
  return {
    controlId: 'AC-2',
    catalogId: 'cat',
    title: 'Manage accounts',
    statusCounts: [],
    computedStatus: 'satisfied',
    ...over,
  };
}

// A tooltip directive stub that mirrors the bound value onto the element so we can
// assert the (otherwise invisible) v-tooltip.top text.
const tooltip = {
  mounted(el: HTMLElement, binding: { value: unknown }) {
    el.setAttribute('data-tooltip', String(binding.value ?? ''));
  },
  updated(el: HTMLElement, binding: { value: unknown }) {
    el.setAttribute('data-tooltip', String(binding.value ?? ''));
  },
};

const stubs = {
  RouterLink: {
    props: ['to'],
    template:
      '<a :data-to-name="to?.name" :data-to-id="to?.params?.id"><slot /></a>',
  },
  ResultStatusBadge: { template: '<span class="result-status-badge" />' },
};

function mountPanel(props: Record<string, unknown>) {
  return mount(ComplianceProgressPanel, {
    props: {
      summary: summary(),
      controls: [],
      groups: [],
      progressTitle: 'Overall',
      ...props,
    },
    global: { directives: { tooltip }, stubs },
  });
}

describe('ComplianceProgressPanel — inherited', () => {
  it('renders six summary tiles including an Inherited tile', () => {
    const wrapper = mountPanel({ summary: summary({ inherited: 3 }) });
    const html = wrapper.html();
    expect(html).toContain('md:grid-cols-6');
    for (const label of [
      'Satisfied',
      'Inherited',
      'Not Satisfied',
      'Unknown',
      'Compliance',
      'Assessed',
    ]) {
      expect(wrapper.text()).toContain(label);
    }
    // The Inherited tile is purple and shows the value.
    expect(html).toContain('bg-purple-50');
    expect(wrapper.text()).toContain('3');
  });

  it('renders the Inherited status pill for a computedStatus="inherited" control', () => {
    const wrapper = mountPanel({
      controls: [control({ computedStatus: 'inherited' })],
    });
    const pill = wrapper
      .findAll('span')
      .find(
        (s) =>
          s.classes().includes('bg-purple-100') && s.text() === 'Inherited',
      );
    expect(pill).toBeTruthy();
  });

  it('renders the leverage badge with its tooltip when control.leverage is present', () => {
    const wrapper = mountPanel({
      controls: [control({ leverage: leverage() })],
    });
    const badge = wrapper.find('[data-tooltip]');
    expect(badge.exists()).toBe(true);
    expect(badge.attributes('data-tooltip')).toContain(
      'From Platform SSP — Managed Postgres v2 · 1/3 responsibilities outstanding',
    );
    expect(badge.text()).toBe('Inherited');
  });

  it('links the leverage badge to the Inherited Capabilities tab when sspId is set', () => {
    const wrapper = mountPanel({
      sspId: 'ssp-42',
      controls: [control({ leverage: leverage() })],
    });
    const link = wrapper.find(
      'a[data-to-name="system-security-plan-inherited-capabilities"]',
    );
    expect(link.exists()).toBe(true);
    expect(link.attributes('data-to-id')).toBe('ssp-42');
    expect(link.text()).toBe('Inherited');
  });

  it('renders the leverage badge as a plain span (no link) without sspId', () => {
    const wrapper = mountPanel({
      controls: [control({ leverage: leverage() })],
    });
    expect(
      wrapper
        .find('a[data-to-name="system-security-plan-inherited-capabilities"]')
        .exists(),
    ).toBe(false);
    expect(wrapper.text()).toContain('Inherited');
  });

  it('de-escalates a drifted leverage badge to amber', () => {
    const wrapper = mountPanel({
      controls: [control({ leverage: leverage({ status: 'drifted' }) })],
    });
    const html = wrapper.html();
    expect(html).toContain('Inherited · drifted');
    expect(html).toContain('amber');
  });
});
