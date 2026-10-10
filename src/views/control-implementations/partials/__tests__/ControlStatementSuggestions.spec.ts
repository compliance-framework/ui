import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
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

const stubs = {
  Button: {
    props: ['disabled', 'label'],
    emits: ['click'],
    template:
      '<button type="button" :disabled="disabled" @click="!disabled && $emit(\'click\', $event)"><slot />{{ label }}</button>',
  },
  Message: {
    template: '<div data-test="message"><slot /></div>',
  },
};

describe('ControlStatementSuggestions', () => {
  function mountComponent(
    props: Partial<
      InstanceType<typeof ControlStatementSuggestions>['$props']
    > = {},
  ) {
    return mount(ControlStatementSuggestions, {
      props: {
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
        ...props,
      },
      global: { stubs },
    });
  }

  it('renders loading, error, empty, and all-applied states', () => {
    expect(mountComponent({ suggestionsLoading: true }).text()).toContain(
      'Loading suggested components...',
    );
    expect(mountComponent({ suggestionsError: 'Failed' }).text()).toContain(
      'Failed to load suggestions.',
    );
    expect(mountComponent({ displayedSuggestions: [] }).text()).toContain(
      'No suggestions available for this statement.',
    );
    expect(
      mountComponent({
        unappliedSuggestions: [],
        allSuggestionsApplied: true,
      }).text(),
    ).toContain('All suggestions applied.');
  });

  it('disables applied and applying suggestions and labels applied suggestions', async () => {
    const wrapper = mountComponent({
      appliedUuids: new Set(['component-1']),
      applyingUuids: new Set(['component-2']),
    });
    const componentOneButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Component One'));
    const componentTwoButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Component Two'));

    expect(wrapper.text()).toContain('Added');
    expect(wrapper.text()).toContain('Relevance: 0.99');
    expect(componentOneButton).toBeTruthy();
    expect(componentTwoButton).toBeTruthy();
    expect(componentOneButton!.attributes('disabled')).toBeDefined();
    expect(componentTwoButton!.attributes('disabled')).toBeDefined();

    await componentOneButton!.trigger('click');
    await componentTwoButton!.trigger('click');

    expect(wrapper.emitted('applySuggestion')).toBeUndefined();
  });

  it('emits applyAll and applySuggestion when enabled suggestion buttons are clicked', async () => {
    const wrapper = mountComponent();
    const applyAllButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Apply All Suggestions'));
    const componentOneButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Component One'));

    expect(applyAllButton).toBeTruthy();
    expect(componentOneButton).toBeTruthy();

    await applyAllButton!.trigger('click');
    await componentOneButton!.trigger('click');

    expect(wrapper.emitted('applyAll')).toHaveLength(1);
    expect(wrapper.emitted('applySuggestion')?.[0]).toEqual([suggestions[0]]);
  });
});
