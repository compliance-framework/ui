import { describe, expect, it } from 'vitest';
import { getSafeExternalHref, isInternalLink } from './links';

describe('links', () => {
  it('only allows http(s) and mailto links to be rendered as external links', () => {
    expect(getSafeExternalHref(' https://github.com/acme ')).toBe(
      'https://github.com/acme',
    );
    expect(getSafeExternalHref('mailto:team@example.com')).toBe(
      'mailto:team@example.com',
    );
    expect(getSafeExternalHref('javascript:alert(1)')).toBe('');
    expect(getSafeExternalHref(undefined)).toBe('');
  });

  it('recognises internal resource references', () => {
    expect(isInternalLink('#resource-1')).toBe(true);
    expect(isInternalLink('https://example.com')).toBe(false);
  });
});
