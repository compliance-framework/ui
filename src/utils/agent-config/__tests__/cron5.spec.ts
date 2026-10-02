import { describe, expect, it } from 'vitest';
import { describeCron5, validateCron5 } from '../cron5';

describe('validateCron5', () => {
  it.each([
    '* * * * *',
    '*/5 * * * *',
    '0 3 * * 1-5',
    '15,45 */2 1 JAN-MAR sun',
    '0 0 ? * *',
    '@hourly',
    '@daily',
    '@midnight',
    '@every 90s',
    '@every 1h30m',
    'CRON_TZ=UTC 0 3 * * *',
    'TZ=Europe/Lisbon 0 3 * * *',
    ' */5 * * * * ',
  ])('accepts %s', (expr) => {
    expect(validateCron5(expr)).toBeNull();
  });

  it.each([
    '',
    '* * * *',
    '* * * * * *',
    '60 * * * *',
    '* 24 * * *',
    '* * 0 * *',
    '* * * 13 *',
    '* * * * 7',
    '*/0 * * * *',
    '5-1 * * * *',
    'every night',
    '@often',
    '@every soon',
    '@daily ',
    ' @daily',
    '@every  5m',
    'TZ=Nowhere/Nope 0 3 * * *',
  ])('rejects %s', (expr) => {
    expect(validateCron5(expr)).not.toBeNull();
  });
});

describe('describeCron5', () => {
  it.each([
    ['* * * * *', 'Every minute'],
    ['*/15 * * * *', 'Every 15 minutes'],
    ['30 * * * *', 'Every hour at minute 30'],
    ['5 3 * * *', 'Every day at 03:05'],
    ['0 9 * * 1', 'Every Monday at 09:00'],
    ['0 9 * * fri', 'Every Friday at 09:00'],
    ['@hourly', 'Every hour'],
    ['@daily', 'Every day at 00:00'],
    ['@weekly', 'Every Sunday at 00:00'],
    ['@monthly', 'On the 1st of every month at 00:00'],
    ['@yearly', 'Every year on 1 January at 00:00'],
    ['@every 10m', 'Every 10m'],
    ['0 9 1 * *', 'Custom schedule'],
    ['0 9-17 * * *', 'Custom schedule'],
  ])('%s → %s', (expr, text) => {
    expect(describeCron5(expr)).toBe(text);
  });
});
