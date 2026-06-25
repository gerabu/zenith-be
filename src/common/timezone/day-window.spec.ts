import { getDayWindow, toDateStringUtc } from './day-window';

describe('getDayWindow', () => {
  it('spans midnight-to-midnight UTC when no timezone is given', () => {
    const { start, end } = getDayWindow('2026-06-25');

    expect(start.toISOString()).toBe('2026-06-25T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-06-26T00:00:00.000Z');
  });

  it('resolves a negative-offset zone (America/New_York, EDT = UTC-4)', () => {
    const { start, end } = getDayWindow('2026-06-25', 'America/New_York');

    expect(start.toISOString()).toBe('2026-06-25T04:00:00.000Z');
    expect(end.toISOString()).toBe('2026-06-26T04:00:00.000Z');
  });

  it('resolves a positive-offset zone (Asia/Tokyo = UTC+9)', () => {
    const { start, end } = getDayWindow('2026-06-25', 'Asia/Tokyo');

    expect(start.toISOString()).toBe('2026-06-24T15:00:00.000Z');
    expect(end.toISOString()).toBe('2026-06-25T15:00:00.000Z');
  });

  it('handles a spring-forward DST transition day (America/New_York, 2026-03-08)', () => {
    // EST (UTC-5) flips to EDT (UTC-4) at 02:00 local; the day is only 23h long.
    const { start, end } = getDayWindow('2026-03-08', 'America/New_York');

    expect(start.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-09T04:00:00.000Z');
    expect(end.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1000);
  });

  it('falls back to UTC for an invalid timezone', () => {
    const { start, end } = getDayWindow('2026-06-25', 'Not/AZone');

    expect(start.toISOString()).toBe('2026-06-25T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-06-26T00:00:00.000Z');
  });
});

describe('toDateStringUtc', () => {
  it('formats a Date as YYYY-MM-DD from its UTC components', () => {
    expect(toDateStringUtc(new Date('2026-06-25T23:30:00.000Z'))).toBe(
      '2026-06-25',
    );
  });
});
