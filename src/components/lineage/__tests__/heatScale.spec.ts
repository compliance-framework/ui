import { describe, it, expect } from 'vitest';
import { heatBucket, heatStyle } from '../heatScale';

describe('heatScale', () => {
  describe('heatBucket boundaries (absolute buckets)', () => {
    it('maps 0 and below to neutral', () => {
      expect(heatBucket(0)).toBe('neutral');
      expect(heatBucket(-5)).toBe('neutral');
    });

    it('maps 1–9 to yellow (inclusive edges)', () => {
      expect(heatBucket(1)).toBe('yellow');
      expect(heatBucket(9)).toBe('yellow');
    });

    it('maps 10–24 to amber (inclusive edges)', () => {
      expect(heatBucket(10)).toBe('amber');
      expect(heatBucket(24)).toBe('amber');
    });

    it('maps 25–49 to orange (inclusive edges)', () => {
      expect(heatBucket(25)).toBe('orange');
      expect(heatBucket(49)).toBe('orange');
    });

    it('maps 50 and above to red', () => {
      expect(heatBucket(50)).toBe('red');
      expect(heatBucket(9999)).toBe('red');
    });

    it('clamps non-finite input to neutral', () => {
      expect(heatBucket(Number.NaN)).toBe('neutral');
      expect(heatBucket(Number.POSITIVE_INFINITY)).toBe('neutral');
    });
  });

  describe('heatStyle', () => {
    it('returns the matching bucket plus class strings', () => {
      const style = heatStyle(30);
      expect(style.bucket).toBe('orange');
      expect(style.swatchClass).toContain('orange');
      expect(style.badgeClass).toContain('orange');
      expect(style.nodeClass).toContain('orange');
      expect(style.label).toBeTruthy();
    });

    it('every bucket carries a dark-mode variant so colours survive dark mode', () => {
      for (const score of [0, 5, 15, 30, 100]) {
        const style = heatStyle(score);
        expect(style.badgeClass).toContain('dark:');
        expect(style.nodeClass).toContain('dark:');
      }
    });
  });
});
