import { DailyAvailability } from './daily-availability';
import { TimeSlot } from './time-slot.vo';

describe('DailyAvailability', () => {
  describe('canBook', () => {
    it('returns true when no booked events', () => {
      expect(
        new DailyAvailability([], []).canBook(
          new TimeSlot({
            start: new Date('1975-09-15T14:00:00'),
            end: new Date('1975-09-15T15:00:00'),
          }),
        ),
      ).toEqual(true);
    });

    it('returns true when no overlaps with existing event', () => {
      expect(
        new DailyAvailability(
          [
            new TimeSlot({
              start: new Date('1975-09-15T14:00:00'),
              end: new Date('1975-09-15T14:15:00'),
            }),
          ],
          [
            new TimeSlot({
              start: new Date('1975-09-15T14:15:00'),
              end: new Date('1975-09-15T14:30:00'),
            }),
          ],
        ).canBook(
          new TimeSlot({
            start: new Date('1975-09-15T14:30:00'),
            end: new Date('1975-09-15T14:45:00'),
          }),
        ),
      ).toEqual(true);
    });

    it('returns false when  overlaps with existing event', () => {
      expect(
        new DailyAvailability(
          [
            new TimeSlot({
              start: new Date('1975-09-15T14:00:00'),
              end: new Date('1975-09-15T14:15:00'),
            }),
          ],
          [
            new TimeSlot({
              start: new Date('1975-09-15T14:15:00'),
              end: new Date('1975-09-15T14:30:00'),
            }),
          ],
        ).canBook(
          new TimeSlot({
            start: new Date('1975-09-15T14:17:00'),
            end: new Date('1975-09-15T14:45:00'),
          }),
        ),
      ).toEqual(false);
    });
  });

  describe('getTimeline', () => {
    const BASE_DATE = '1975-09-15';
    const dayStart = new Date(`${BASE_DATE}T00:00:00.000Z`);
    const dayEnd = new Date(`${BASE_DATE}T23:59:59.999Z`);

    const createSlot = (startHour: string, endHour: string) => {
      return new TimeSlot({
        start: new Date(`${BASE_DATE}T${startHour}:00.000Z`),
        end: new Date(`${BASE_DATE}T${endHour}:00.000Z`),
      });
    };

    it('returns full 24-hour availability when there are no internal or external events', () => {
      const da = new DailyAvailability([], []);
      const timeline = da.getTimeline(dayStart, dayEnd);

      expect(timeline).toHaveLength(1);
      expect(timeline[0].status).toBe('available');
      expect(timeline[0].slot.toPrimitives().start).toEqual(dayStart);
      expect(timeline[0].slot.toPrimitives().end).toEqual(dayEnd);
    });

    it('returns exactly 3 structured blocks when a single internal booking splits the day', () => {
      const internalBookings = [createSlot('10:00', '11:30')];
      const da = new DailyAvailability(internalBookings, []);

      const timeline = da.getTimeline(dayStart, dayEnd);

      expect(timeline).toHaveLength(3);

      expect(timeline[0].status).toBe('available');
      expect(timeline[0].slot.toPrimitives().start.toISOString()).toBe(
        `${BASE_DATE}T00:00:00.000Z`,
      );
      expect(timeline[0].slot.toPrimitives().end.toISOString()).toBe(
        `${BASE_DATE}T10:00:00.000Z`,
      );

      expect(timeline[1].status).toBe('booked');
      expect(timeline[1].slot.toPrimitives().start.toISOString()).toBe(
        `${BASE_DATE}T10:00:00.000Z`,
      );
      expect(timeline[1].slot.toPrimitives().end.toISOString()).toBe(
        `${BASE_DATE}T11:30:00.000Z`,
      );

      expect(timeline[2].status).toBe('available');
      expect(timeline[2].slot.toPrimitives().start.toISOString()).toBe(
        `${BASE_DATE}T11:30:00.000Z`,
      );
      expect(timeline[2].slot.toPrimitives().end.toISOString()).toBe(
        `${BASE_DATE}T23:59:59.999Z`,
      );
    });

    it('returns the timeline with external status properly mapped for Google Calendar events', () => {
      const googleEvents = [createSlot('14:00', '15:00')];
      const da = new DailyAvailability([], googleEvents);

      const timeline = da.getTimeline(dayStart, dayEnd);

      const externalBlock = timeline.find((b) => b.status === 'external');
      expect(externalBlock).toBeDefined();
      expect(externalBlock!.slot.toPrimitives().start.toISOString()).toBe(
        `${BASE_DATE}T14:00:00.000Z`,
      );
      expect(externalBlock!.slot.toPrimitives().end.toISOString()).toBe(
        `${BASE_DATE}T15:00:00.000Z`,
      );
    });

    it('returns continuous booked segments without false available gaps for back-to-back events', () => {
      const internalBookings = [
        createSlot('14:00', '15:00'),
        createSlot('15:00', '16:00'),
      ];
      const da = new DailyAvailability(internalBookings, []);

      const timeline = da.getTimeline(dayStart, dayEnd);

      expect(timeline).toHaveLength(4);

      expect(timeline[1].slot.toPrimitives().end.toISOString()).toBe(
        `${BASE_DATE}T15:00:00.000Z`,
      );
      expect(timeline[2].slot.toPrimitives().start.toISOString()).toBe(
        `${BASE_DATE}T15:00:00.000Z`,
      );

      const availableBetween = timeline.find(
        (b) =>
          b.status === 'available' &&
          b.slot.toPrimitives().start.getTime() >=
            new Date(`${BASE_DATE}T14:00:00.000Z`).getTime() &&
          b.slot.toPrimitives().end.getTime() <=
            new Date(`${BASE_DATE}T16:00:00.000Z`).getTime(),
      );
      expect(availableBetween).toBeUndefined();
    });

    it('returns a single 24-hour external block when a Google event spans the entire day', () => {
      const googleEvents = [new TimeSlot({ start: dayStart, end: dayEnd })];
      const da = new DailyAvailability([], googleEvents);

      const timeline = da.getTimeline(dayStart, dayEnd);

      expect(timeline).toHaveLength(1);
      expect(timeline[0].status).toBe('external');
      expect(timeline[0].slot.toPrimitives().start).toEqual(dayStart);
      expect(timeline[0].slot.toPrimitives().end).toEqual(dayEnd);
    });

    it('returns full 24-hour availability by completely ignoring events from previous or next days', () => {
      const previousDayEvent = new TimeSlot({
        start: new Date('1975-09-14T19:00:00.000Z'),
        end: new Date('1975-09-14T21:00:00.000Z'),
      });
      const da = new DailyAvailability([], [previousDayEvent]);

      const timeline = da.getTimeline(dayStart, dayEnd);

      expect(timeline).toHaveLength(1);
      expect(timeline[0].status).toBe('available');
      expect(timeline[0].slot.toPrimitives().start).toEqual(dayStart);
      expect(timeline[0].slot.toPrimitives().end).toEqual(dayEnd);
    });
  });
});
