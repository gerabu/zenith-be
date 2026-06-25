/** A half-open day window `[start, end)` as absolute UTC instants. */
export interface DayWindow {
  start: Date;
  end: Date;
}

/** Returns `timeZone` if it is a valid IANA zone, otherwise `'UTC'`. */
function resolveTimeZone(timeZone?: string): string {
  if (!timeZone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Offset of `timeZone` at the given UTC instant, in milliseconds east of UTC.
 * Derived from how `Intl` renders the instant's wall-clock time in that zone.
 */
function offsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));

  const f: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') f[p.type] = Number(p.value);
  }

  const wallAsUtc = Date.UTC(
    f.year,
    f.month - 1,
    f.day,
    f.hour,
    f.minute,
    f.second,
  );
  return wallAsUtc - utcMs;
}

/**
 * The UTC instant of `00:00` on the given calendar date in `timeZone`.
 * DST-aware: the offset is resolved for that specific date, with a single
 * refinement pass so the boundary lands correctly across a DST transition.
 */
function zonedMidnightUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): Date {
  const guessMs = Date.UTC(year, month - 1, day);
  let resultMs = guessMs - offsetMs(guessMs, timeZone);
  const refinedOffset = offsetMs(resultMs, timeZone);
  if (resultMs !== guessMs - refinedOffset) {
    resultMs = guessMs - refinedOffset;
  }
  return new Date(resultMs);
}

/** Formats a Date as `YYYY-MM-DD` from its UTC components. */
export function toDateStringUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The day window for `dateStr` (`YYYY-MM-DD`) interpreted as a calendar day in
 * `timeZone`: from local midnight of that date to local midnight of the next
 * calendar day. An absent or invalid `timeZone` falls back to UTC.
 */
export function getDayWindow(dateStr: string, timeZone?: string): DayWindow {
  const tz = resolveTimeZone(timeZone);
  const [year, month, day] = dateStr.split('-').map(Number);

  const start = zonedMidnightUtc(year, month, day, tz);
  // Advance by calendar date (not +24h) so DST-shortened/lengthened days stay correct.
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const end = zonedMidnightUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    tz,
  );

  return { start, end };
}
