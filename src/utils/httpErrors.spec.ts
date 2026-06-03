import { describe, it, expect } from 'vitest';
import { getErrorDetail } from './httpErrors';

describe('getErrorDetail', () => {
  describe('Response errors', () => {
    it('returns errors.body when present', async () => {
      const response = new Response(
        JSON.stringify({ errors: { body: 'validation failed' } }),
        { status: 400, statusText: 'Bad Request' },
      );
      expect(await getErrorDetail(response, 'fallback')).toBe(
        'validation failed',
      );
    });

    it('preserves empty string errors.body instead of falling back', async () => {
      const response = new Response(JSON.stringify({ errors: { body: '' } }), {
        status: 400,
        statusText: 'Bad Request',
      });
      expect(await getErrorDetail(response, 'fallback')).toBe('');
    });

    it('returns message when errors.body is absent', async () => {
      const response = new Response(
        JSON.stringify({ message: 'something went wrong' }),
        { status: 400, statusText: 'Bad Request' },
      );
      expect(await getErrorDetail(response, 'fallback')).toBe(
        'something went wrong',
      );
    });

    it('returns error field when message is absent', async () => {
      const response = new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        statusText: 'Unauthorized',
      });
      expect(await getErrorDetail(response, 'fallback')).toBe('unauthorized');
    });

    it('returns detail field when message and error are absent', async () => {
      const response = new Response(JSON.stringify({ detail: 'not found' }), {
        status: 404,
        statusText: 'Not Found',
      });
      expect(await getErrorDetail(response, 'fallback')).toBe('not found');
    });

    it('falls back to statusText when JSON is unparseable', async () => {
      const response = new Response('not-json', {
        status: 500,
        statusText: 'Internal Server Error',
      });
      expect(await getErrorDetail(response, 'fallback')).toBe(
        'Internal Server Error',
      );
    });

    it('falls back to statusText when JSON body is null', async () => {
      const response = new Response('null', {
        status: 500,
        statusText: 'Internal Server Error',
      });
      expect(await getErrorDetail(response, 'fallback')).toBe(
        'Internal Server Error',
      );
    });

    it('falls back to fallback when statusText is also empty', async () => {
      const response = new Response('null', { status: 500, statusText: '' });
      expect(await getErrorDetail(response, 'fallback')).toBe('fallback');
    });
  });

  describe('Axios errors', () => {
    it('returns errors.body when present', async () => {
      const error = {
        response: { data: { errors: { body: 'validation failed' } } },
        message: 'Request failed',
      };
      expect(await getErrorDetail(error, 'fallback')).toBe('validation failed');
    });

    it('falls back when errors.body is empty', async () => {
      const error = {
        response: { data: { errors: { body: '' } } },
        message: 'Request failed',
      };
      expect(await getErrorDetail(error, 'fallback')).toBe('Request failed');
    });

    it('falls back when errors.body is null', async () => {
      const error = {
        response: { data: { errors: { body: null } } },
        message: 'Request failed',
      };
      expect(await getErrorDetail(error, 'fallback')).toBe('Request failed');
    });

    it('falls back to message when errors.body is undefined', async () => {
      const error = {
        response: { data: { errors: {} } },
        message: 'Request failed',
      };
      expect(await getErrorDetail(error, 'fallback')).toBe('Request failed');
    });

    it('returns response message when present', async () => {
      const error = {
        response: { data: { message: 'no files provided' } },
        message: 'Request failed',
      };
      expect(await getErrorDetail(error, 'fallback')).toBe('no files provided');
    });

    it('falls back to error message when response data is primitive', async () => {
      const error = {
        response: { data: 'bad request' },
        message: 'Request failed',
      };
      expect(await getErrorDetail(error, 'fallback')).toBe('Request failed');
    });

    it('falls back to fallback when response data is primitive and message is empty', async () => {
      const error = {
        response: { data: 'bad request' },
        message: '',
      };
      expect(await getErrorDetail(error, 'fallback')).toBe('fallback');
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
