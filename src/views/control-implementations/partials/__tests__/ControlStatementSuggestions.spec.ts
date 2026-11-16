import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from 'reka-ui';
import ControlStatementSuggestions from '../ControlStatementSuggestions.vue';
import type { SuggestedComponent } from '../component-suggestions';

const suggestions = [
  {
    componentUuid: 'component-1',
    title: 'Component One',
    type: 'service',
    relevanceScore: 0.987,
  },
  {
    componentUuid: 'component-2',
    title: 'Component Two',
    type: 'policy',
  },
] as SuggestedComponent[];

function mountComponent(props: Record<string, unknown> = {}) {
  const events: Record<string, unknown[][]> = {};
  const record =
    (name: string) =>
    (...args: unknown[]) =>
      (events[name] ??= []).push(args);
  const wrapper = mount(
    defineComponent({
      render: () =>
        h(TooltipProvider, null, () =>
          h(ControlStatementSuggestions, {
            statementReady: true,
            sspReady: true,
            suggestionsLoading: false,
            suggestionsError: '',
            displayedSuggestions: suggestions,
            unappliedSuggestions: suggestions,
            allSuggestionsApplied: false,
            applyingAllSuggestions: false,
            appliedUuids: new Set<string>(),
            applyingUuids: new Set<string>(),
            onApplyAll: record('applyAll'),
            onApplySuggestion: record('applySuggestion'),
            ...props,
          }),
        ),
    }),
  );
  return { wrapper, events };
}

// The Add button in a suggestion's row.
const addButton = (wrapper: ReturnType<typeof mount>, title: string) =>
  wrapper
    .findAll('li')
    .find((li) => li.text().includes(title))!
    .find('button');

describe('ControlStatementSuggestions', () => {
  it('shows loading, error, empty and all-applied states', () => {
    expect(
      mountComponent({ suggestionsLoading: true }).wrapper.text(),
    ).toContain('Loading suggested components');
    expect(
      mountComponent({ suggestionsError: 'Failed' }).wrapper.text(),
    ).toContain('Suggestions not loaded');
    expect(
      mountComponent({ displayedSuggestions: [] }).wrapper.text(),
    ).toContain('No suggestions for this statement.');
    expect(
      mountComponent({
        unappliedSuggestions: [],
        allSuggestionsApplied: true,
      }).wrapper.text(),
    ).toContain('All suggestions applied.');
  });

  it('disables applied and applying suggestions, saying why', async () => {
    const { wrapper, events } = mountComponent({
      appliedUuids: new Set(['component-1']),
      applyingUuids: new Set(['component-2']),
    });
    expect(wrapper.text()).toContain('Relevance 0.99');
    const one = addButton(wrapper, 'Component One');
    const two = addButton(wrapper, 'Component Two');
    expect(one.text()).toContain('Added');
    expect(one.attributes('aria-disabled')).toBe('true');
    expect(two.attributes('aria-disabled')).toBe('true');
    await one.trigger('click');
    await two.trigger('click');
    expect(events.applySuggestion).toBeUndefined();
  });

  it('applies all, or one suggestion', async () => {
    const { wrapper, events } = mountComponent();
    await wrapper
      .findAll('button')
      .find((b) => b.text().startsWith('Apply all suggestions'))!
      .trigger('click');
    await addButton(wrapper, 'Component One').trigger('click');
    expect(events.applyAll).toHaveLength(1);
    expect(events.applySuggestion?.[0]).toEqual([suggestions[0]]);
  });
});
