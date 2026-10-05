import { describe, expect, it } from 'vitest';
import { formatRelative } from '../display';

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
