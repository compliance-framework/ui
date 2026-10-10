import { describe, expect, it } from 'vitest';
import {
  isBlankLink,
  isBlankProperty,
  propertyAndLinkErrors,
} from '../editors/sspEditorHelpers';

describe('property and link rows', () => {
  it('treats whitespace-only rows as blank', () => {
    expect(isBlankProperty({ name: ' ', value: '' })).toBe(true);
    expect(isBlankLink({ href: '', text: '  ', rel: undefined })).toBe(true);
    expect(isBlankProperty({ name: 'type', value: '' })).toBe(false);
  });

  it('accepts complete rows and ignores blank ones', () => {
    expect(
      propertyAndLinkErrors(
        [
          { name: 'type', value: 'saas' },
          { name: '', value: '' },
        ],
        [{ href: 'https://example.com' }, { href: '', text: '' }],
      ),
    ).toEqual([]);
  });

  it('reports partly filled rows by position', () => {
    expect(
      propertyAndLinkErrors(
        [
          { name: 'type', value: 'saas' },
          { name: 'owner', value: '' },
          { name: '', value: 'orphan value' },
        ],
        [{ href: '', text: 'Runbook' }],
      ),
    ).toEqual([
      'Property 2 needs both a name and a value.',
      'Property 3 needs both a name and a value.',
      'Link 1 needs an HREF.',
    ]);
  });
});
