import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import ControlImplementationSuggestions from '../ControlImplementationSuggestions.vue';
import type {
  ControlSuggestionResult,
  DashboardSuggestion,
} from '@/views/dashboard/partials/dashboard-suggestions';

function suggestion(
  overrides: Partial<DashboardSuggestion> = {},
): DashboardSuggestion {
  return {
    id: 'suggestion-1',
    status: 'pending',
    controlId: 'AC-1',
    labelSetHash: 'hash-1',
    proposedFilterName: 'Production evidence',
    proposedFilterLabelSet: {
      env: 'prod',
      service: 'api',
      _policy: 'internal',
    },
    confidence: 0.91,
    reasoning: 'The production API evidence maps cleanly to this control.',
    ...overrides,
  };
}

function mountComponent(props: {
  suggestions?: DashboardSuggestion[];
  result?: ControlSuggestionResult;
  loading?: boolean;
}) {
  return mount(ControlImplementationSuggestions, {
    props: {
      controlId: 'ac-1',
      sspId: 'ssp-1',
      suggestions: [],
      ...props,
    },
    global: {
      stubs: {
        Chip: {
          props: ['label'],
          template: '<span>{{ label }}</span>',
        },
        Message: {
          template: '<div data-test="message"><slot /></div>',
        },
        RouterLink: defineComponent({
          name: 'RouterLink',
          props: ['to'],
          template: '<a data-test="review-link"><slot /></a>',
        }),
      },
    },
  });
}

describe('ControlImplementationSuggestions', () => {
  it('renders a loading state while AI state is loading', () => {
    expect(mountComponent({ suggestions: [], loading: true }).text()).toContain(
      'Loading AI dashboard suggestions...',
    );
  });

  it('lists pending suggestions with labels, confidence, reasoning, and review link', () => {
    const wrapper = mountComponent({ suggestions: [suggestion()] });

    expect(wrapper.text()).toContain('AI dashboard suggestions');
    expect(wrapper.text()).toContain('Production evidence');
    expect(wrapper.text()).toContain('env=prod');
    expect(wrapper.text()).toContain('service=api');
    expect(wrapper.text()).not.toContain('_policy=internal');
    expect(wrapper.text()).toContain('91% confidence');
    expect(wrapper.text()).toContain(
      'The production API evidence maps cleanly to this control.',
    );
    expect(wrapper.find('[data-test="review-link"]').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'RouterLink' }).props('to')).toEqual({
      name: 'dashboards.suggestions',
      params: { sspId: 'ssp-1' },
    });
  });

  it('renders evaluated no-match state with the run date', () => {
    const evaluatedAt = '2026-06-18T10:30:00Z';
    const wrapper = mountComponent({
      result: {
        controlId: 'AC-2',
        outcome: 'no_match',
        evaluatedAt,
      },
    });

    expect(wrapper.text()).toContain(
      'AI reviewed this control and found no matching dashboard filter',
    );
    expect(wrapper.text()).toContain(new Date(evaluatedAt).toLocaleString());
  });

  it('renders subtle empty states for not evaluated and matched-without-pending controls', () => {
    expect(mountComponent({}).text()).toContain(
      "AI hasn't evaluated this control yet.",
    );
    expect(
      mountComponent({
        result: {
          controlId: 'AC-1',
          outcome: 'matched',
        },
      }).text(),
    ).toContain('No pending AI dashboard suggestions for this control.');
  });
});
