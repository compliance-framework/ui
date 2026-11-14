import { describe, expect, it } from 'vitest';
import { partMarkdown } from './oscal-parts';

describe('partMarkdown', () => {
  it('renders labelled sub-parts indented under their parent', () => {
    expect(
      partMarkdown({
        id: 's',
        name: 'statement',
        prose: 'The organization:',
        parts: [
          {
            id: 's.a',
            name: 'item',
            prose: 'Defines accounts;',
            props: [{ name: 'label', value: 'a.' }],
          },
          {
            id: 's.wrap',
            name: 'item',
            parts: [{ id: 's.b', name: 'item', prose: 'Reviews them.' }],
          },
        ],
      }),
    ).toBe('The organization:\n  a. Defines accounts;\n  Reviews them.\n');
  });
});
