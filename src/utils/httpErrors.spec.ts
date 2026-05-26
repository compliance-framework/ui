import { describe, it, expect } from 'vitest';
import { getErrorDetail } from './httpErrors';

describe('getErrorDetail', () => {
  describe('Axios errors', () => {
    it('returns errors.body when present', async () => {
      const error = {
        response: { data: { errors: { body: 'validation failed' } } },
        message: 'Request failed',
      };
      expect(await getErrorDetail(error, 'fallback')).toBe('validation failed');
    });

    it('preserves empty string errors.body instead of falling back', async () => {
      const error = {
        response: { data: { errors: { body: '' } } },
        message: 'Request failed',
      };
      expect(await getErrorDetail(error, 'fallback')).toBe('');
    });

    it('falls back to message when errors.body is undefined', async () => {
      const error = {
        response: { data: { errors: {} } },
        message: 'Request failed',
      };
      expect(await getErrorDetail(error, 'fallback')).toBe('Request failed');
    });

    it('falls back to message when no response data', async () => {
      const error = { response: null, message: 'Network error' };
      expect(await getErrorDetail(error, 'fallback')).toBe('Network error');
    });

    it('falls back to fallback message when all else is empty', async () => {
      const error = { response: null, message: '' };
      expect(await getErrorDetail(error, 'fallback')).toBe('fallback');
    });
  });
});
