import { describe, expect, it } from 'vitest';
import type { AxiosError } from 'axios';
import type { ErrorBody, ErrorResponse } from '@/stores/types';
import { formatError } from './error-formatting';

describe('formatError', () => {
  it('formats axios errors with status code and API detail', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 404,
        data: {
          errors: {
            body: 'User not found',
          },
        },
      },
      message: 'Request failed',
    } as AxiosError<ErrorResponse<ErrorBody>>;

    const formatted = formatError(axiosError);

    expect(formatted.summary).toBe('Not Found');
    expect(formatted.detail).toBe('User not found');
    expect(formatted.statusCode).toBe(404);
  });

  it('falls back to Error message when non-Axios error is thrown', () => {
    const formatted = formatError(new Error('Something went wrong'));
    expect(formatted.summary).toBe('Error');
    expect(formatted.detail).toBe('Something went wrong');
    expect(formatted.statusCode).toBeUndefined();
  });

  it('supports simple string errors', () => {
    const formatted = formatError('plain string error');
    expect(formatted.summary).toBe('Error');
    expect(formatted.detail).toBe('plain string error');
  });
});
