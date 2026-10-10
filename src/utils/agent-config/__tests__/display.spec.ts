import { describe, expect, it } from 'vitest';
import { formatRelative, sanitizeForDisplay } from '../display';

describe('sanitizeForDisplay', () => {
  it('drops api.auth.client_secret from a copy and leaves the input alone', () => {
    const doc = {
      api: {
        url: 'https://api.example.com',
        auth: { client_id: 'id', client_secret: 's3cret' },
      },
      plugins: { ssh: { config: { client_secret: 'kept: not the API key' } } },
    };
    const input = structuredClone(doc);
    const out = sanitizeForDisplay(doc);
    expect(out).toEqual({
      api: { url: 'https://api.example.com', auth: { client_id: 'id' } },
      plugins: { ssh: { config: { client_secret: 'kept: not the API key' } } },
    });
    expect(doc).toEqual(input);
    expect(out).not.toBe(doc);
  });

  it('passes through documents without api.auth and non-objects', () => {
    expect(sanitizeForDisplay({ verbosity: 1 })).toEqual({ verbosity: 1 });
    expect(sanitizeForDisplay(null)).toBeNull();
    expect(sanitizeForDisplay('x')).toBe('x');
  });
});

describe('formatRelative', () => {
  it('formats past and future times', () => {
    const now = Date.parse('2026-09-30T12:00:00Z');
    expect(formatRelative('2026-09-30T10:00:00Z', now, 'en')).toBe(
      '2 hours ago',
    );
    expect(formatRelative('2026-10-03T12:00:00Z', now, 'en')).toBe('in 3 days');
    expect(formatRelative('2026-09-30T12:00:20Z', now, 'en')).toBe(
      'this minute',
    );
    expect(formatRelative(null)).toBe('');
    expect(formatRelative('garbage')).toBe('');
  });
});
