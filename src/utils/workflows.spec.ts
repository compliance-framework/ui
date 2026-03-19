import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRACE_PERIOD_DAYS,
  parseGracePeriodInput,
  toGracePeriodInputValue,
} from './workflows';

describe('workflows utils', () => {
  describe('toGracePeriodInputValue', () => {
    it('returns provided grace period when present', () => {
      expect(toGracePeriodInputValue(14)).toBe('14');
    });

    it('returns fallback when grace period is undefined', () => {
      expect(toGracePeriodInputValue(undefined, 21)).toBe('21');
    });

    it('returns default fallback when grace period is null', () => {
      expect(toGracePeriodInputValue(null)).toBe(
        String(DEFAULT_GRACE_PERIOD_DAYS),
      );
    });
  });

  describe('parseGracePeriodInput', () => {
    it('accepts numeric values from number-backed inputs', () => {
      expect(parseGracePeriodInput(7)).toEqual({ value: 7 });
      expect(parseGracePeriodInput(0)).toEqual({ value: 0 });
    });
    it('returns fallback for empty input', () => {
      expect(parseGracePeriodInput('')).toEqual({
        value: DEFAULT_GRACE_PERIOD_DAYS,
      });
      expect(parseGracePeriodInput('   ', 3)).toEqual({ value: 3 });
    });

    it('accepts valid integer inputs', () => {
      expect(parseGracePeriodInput('0')).toEqual({ value: 0 });
      expect(parseGracePeriodInput('7')).toEqual({ value: 7 });
    });

    it('rejects negative values', () => {
      expect(parseGracePeriodInput('-1', 5)).toEqual({
        value: 5,
        error: 'Grace period must be a non-negative whole number (no decimals)',
      });
    });

    it('rejects decimal values', () => {
      expect(parseGracePeriodInput('7.5', 9)).toEqual({
        value: 9,
        error: 'Grace period must be a non-negative whole number (no decimals)',
      });
      expect(parseGracePeriodInput('7.0', 9)).toEqual({
        value: 9,
        error: 'Grace period must be a non-negative whole number (no decimals)',
      });
    });

    it('rejects scientific and non-decimal numeric formats', () => {
      expect(parseGracePeriodInput('1e2', 9)).toEqual({
        value: 9,
        error: 'Grace period must be a non-negative whole number (no decimals)',
      });
      expect(parseGracePeriodInput('0x10', 9)).toEqual({
        value: 9,
        error: 'Grace period must be a non-negative whole number (no decimals)',
      });
    });

    it('rejects non-numeric values', () => {
      expect(parseGracePeriodInput('abc', 2)).toEqual({
        value: 2,
        error: 'Grace period must be a non-negative whole number (no decimals)',
      });
    });
  });
});
