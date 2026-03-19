import { describe, it, expect } from 'vitest';
import { validateCronExpression } from './cron';

describe('validateCronExpression', () => {
  describe('valid expressions', () => {
    it('accepts standard cron with all wildcards', () => {
      expect(validateCronExpression('* * * * * *')).toBeNull();
    });

    it('accepts specific values', () => {
      expect(validateCronExpression('0 30 9 15 6 1')).toBeNull();
    });

    it('accepts ranges with dash', () => {
      expect(validateCronExpression('0-30 0-59 9-17 1-15 1-12 0-6')).toBeNull();
    });

    it('accepts step values with slash', () => {
      expect(validateCronExpression('*/10 */5 */2 */3 */2 */1')).toBeNull();
    });

    it('accepts comma-separated lists', () => {
      expect(
        validateCronExpression('0,30 0,15,30,45 9,12,18 1,15 1,6 1,3,5'),
      ).toBeNull();
    });

    it('accepts complex expressions', () => {
      expect(validateCronExpression('0 0 */2 1-15 * 1-5')).toBeNull();
    });

    it('accepts day of week 7 (Sunday alternate)', () => {
      expect(validateCronExpression('0 0 0 * * 7')).toBeNull();
    });
  });

  describe('field count validation', () => {
    it('rejects expressions with fewer than 6 fields', () => {
      expect(validateCronExpression('* * * * *')).toBe(
        'Cron expression must have exactly 6 fields (seconds minutes hours day month weekday)',
      );
    });

    it('rejects expressions with more than 6 fields', () => {
      expect(validateCronExpression('* * * * * * *')).toBe(
        'Cron expression must have exactly 6 fields (seconds minutes hours day month weekday)',
      );
    });

    it('rejects empty string', () => {
      expect(validateCronExpression('')).toBe(
        'Cron expression must have exactly 6 fields (seconds minutes hours day month weekday)',
      );
    });
  });

  describe('invalid characters', () => {
    it('rejects garbage text', () => {
      expect(
        validateCronExpression(
          'garbage garbage garbage garbage garbage garbage',
        ),
      ).toBe('Seconds: invalid characters (use digits, *, -, /, ,)');
    });

    it('rejects letters in fields', () => {
      expect(validateCronExpression('0 0 0 * * MON')).toBe(
        'Day of week: invalid characters (use digits, *, -, /, ,)',
      );
    });

    it('rejects special characters like @', () => {
      expect(validateCronExpression('@daily * * * * *')).toBe(
        'Seconds: invalid characters (use digits, *, -, /, ,)',
      );
    });

    it('rejects question marks', () => {
      expect(validateCronExpression('0 0 0 ? * *')).toBe(
        'Day of month: invalid characters (use digits, *, -, /, ,)',
      );
    });
  });

  describe('range validation - seconds', () => {
    it('rejects seconds > 59', () => {
      expect(validateCronExpression('60 * * * * *')).toBe(
        'Seconds: value 60 out of range (0-59)',
      );
    });

    it('accepts seconds = 59', () => {
      expect(validateCronExpression('59 * * * * *')).toBeNull();
    });

    it('accepts seconds = 0', () => {
      expect(validateCronExpression('0 * * * * *')).toBeNull();
    });
  });

  describe('range validation - minutes', () => {
    it('rejects minutes > 59', () => {
      expect(validateCronExpression('0 99 * * * *')).toBe(
        'Minutes: value 99 out of range (0-59)',
      );
    });
  });

  describe('range validation - hours', () => {
    it('rejects hours > 23', () => {
      expect(validateCronExpression('0 0 24 * * *')).toBe(
        'Hours: value 24 out of range (0-23)',
      );
    });

    it('accepts hours = 23', () => {
      expect(validateCronExpression('0 0 23 * * *')).toBeNull();
    });
  });

  describe('range validation - day of month', () => {
    it('rejects day > 31', () => {
      expect(validateCronExpression('0 0 0 32 * *')).toBe(
        'Day of month: value 32 out of range (1-31)',
      );
    });

    it('rejects day = 0', () => {
      expect(validateCronExpression('0 0 0 0 * *')).toBe(
        'Day of month: value 0 out of range (1-31)',
      );
    });

    it('accepts day = 31', () => {
      expect(validateCronExpression('0 0 0 31 * *')).toBeNull();
    });
  });

  describe('range validation - month', () => {
    it('rejects month > 12', () => {
      expect(validateCronExpression('0 0 0 * 13 *')).toBe(
        'Month: value 13 out of range (1-12)',
      );
    });

    it('rejects month = 0', () => {
      expect(validateCronExpression('0 0 0 * 0 *')).toBe(
        'Month: value 0 out of range (1-12)',
      );
    });
  });

  describe('range validation - day of week', () => {
    it('rejects day of week > 7', () => {
      expect(validateCronExpression('0 0 0 * * 8')).toBe(
        'Day of week: value 8 out of range (0-7)',
      );
    });

    it('accepts day of week = 0 (Sunday)', () => {
      expect(validateCronExpression('0 0 0 * * 0')).toBeNull();
    });

    it('accepts day of week = 7 (Sunday alternate)', () => {
      expect(validateCronExpression('0 0 0 * * 7')).toBeNull();
    });
  });

  describe('complex invalid expressions', () => {
    it('rejects out-of-range values in ranges', () => {
      expect(validateCronExpression('0 0 0-25 * * *')).toBe(
        'Hours: value 25 out of range (0-23)',
      );
    });

    it('rejects out-of-range values in lists', () => {
      expect(validateCronExpression('0 0 0 1,32 * *')).toBe(
        'Day of month: value 32 out of range (1-31)',
      );
    });

    it('rejects ridiculous numbers', () => {
      expect(validateCronExpression('99 18293 8239 99 0182 272')).toBe(
        'Seconds: value 99 out of range (0-59)',
      );
    });
  });
});
