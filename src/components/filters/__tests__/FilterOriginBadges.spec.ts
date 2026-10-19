import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import FilterOriginBadges from '../FilterOriginBadges.vue';

const base = {
  scope: { condition: { label: '_policy', operator: '=', value: 'p' } },
};

function badges(filter: Record<string, unknown>) {
  const wrapper = mount(FilterOriginBadges, {
    props: { filter } as never,
  });
  return {
    follows: wrapper.find('[data-testid="badge-follows-scope"]').exists(),
    automatic: wrapper.find('[data-testid="badge-automatic"]').exists(),
    text: wrapper.text(),
  };
}

describe('FilterOriginBadges', () => {
  it('shows nothing for a plain filter', () => {
    expect(badges({ origin: 'manual', scopeBase: null })).toEqual({
      follows: false,
      automatic: false,
      text: '',
    });
  });

  it('marks a filter that follows its scope', () => {
    const shown = badges({ origin: 'manual', scopeBase: base });
    expect(shown.follows).toBe(true);
    expect(shown.automatic).toBe(false);
    expect(shown.text).toContain('Follows scope');
  });

  it('marks an automatic per-policy filter, which also follows the scope', () => {
    const shown = badges({ origin: 'scope-policy', scopeBase: base });
    expect(shown.follows).toBe(true);
    expect(shown.automatic).toBe(true);
    expect(shown.text).toContain('Automatic');
  });
});
