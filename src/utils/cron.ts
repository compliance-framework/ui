/**
 * Validates a 6-field cron expression.
 * Fields: seconds minutes hours day-of-month month day-of-week
 * @returns Error message string if invalid, null if valid
 */
export function validateCronExpression(expr: string): string | null {
  const parts = expr.split(/\s+/);
  if (parts.length !== 6) {
    return 'Cron expression must have exactly 6 fields (seconds minutes hours day month weekday)';
  }
  const ranges = [
    { name: 'Seconds', min: 0, max: 59 },
    { name: 'Minutes', min: 0, max: 59 },
    { name: 'Hours', min: 0, max: 23 },
    { name: 'Day of month', min: 1, max: 31 },
    { name: 'Month', min: 1, max: 12 },
    { name: 'Day of week', min: 0, max: 7 },
  ];
  for (let i = 0; i < 6; i++) {
    const field = parts[i];
    const { name, min, max } = ranges[i];
    if (!/^[\d*,\-/]+$/.test(field)) {
      return `${name}: invalid characters (use digits, *, -, /, ,)`;
    }
    const nums = field.match(/\d+/g);
    if (nums) {
      for (const n of nums) {
        const num = parseInt(n, 10);
        if (num < min || num > max) {
          return `${name}: value ${num} out of range (${min}-${max})`;
        }
      }
    }
  }
  return null;
}
