import { describe, expect, it } from 'vitest';
import {
  resolveSlackCallbackCode,
  resolveSlackCallbackStatus,
} from './slack-link-callback';

describe('slack-link-callback utilities', () => {
  describe('resolveSlackCallbackStatus', () => {
    it('returns success and error for valid inputs', () => {
      expect(resolveSlackCallbackStatus('success')).toBe('success');
      expect(resolveSlackCallbackStatus('error')).toBe('error');
    });

    it('normalizes case for valid status values', () => {
      expect(resolveSlackCallbackStatus('SUCCESS')).toBe('success');
      expect(resolveSlackCallbackStatus('ErRoR')).toBe('error');
    });

    it('returns null for invalid or non-string values', () => {
      expect(resolveSlackCallbackStatus('pending')).toBeNull();
      expect(resolveSlackCallbackStatus('')).toBeNull();
      expect(resolveSlackCallbackStatus(undefined)).toBeNull();
      expect(resolveSlackCallbackStatus(['success'])).toBeNull();
      expect(resolveSlackCallbackStatus(1)).toBeNull();
    });
  });

  describe('resolveSlackCallbackCode', () => {
    it('returns code when it is a non-empty string', () => {
      expect(resolveSlackCallbackCode('not_configured')).toBe('not_configured');
      expect(resolveSlackCallbackCode('E123')).toBe('E123');
    });

    it('returns undefined for empty or non-string values', () => {
      expect(resolveSlackCallbackCode('')).toBeUndefined();
      expect(resolveSlackCallbackCode(undefined)).toBeUndefined();
      expect(resolveSlackCallbackCode(['error'])).toBeUndefined();
      expect(resolveSlackCallbackCode(404)).toBeUndefined();
    });
  });
});
