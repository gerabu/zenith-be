import { TimeSlot } from './time-slot.vo';

export type SlotStatus = 'available' | 'booked' | 'external';
export type TimelineBlock = { slot: TimeSlot; status: SlotStatus };

export class DailyAvailability {
  private readonly busySlots: TimelineBlock[];

  constructor(internalBookings: TimeSlot[], externalEvents: TimeSlot[]) {
    const mappedBookings = internalBookings.map((slot) => ({
      slot,
      status: 'booked' as const,
    }));
    const mappedExternal = externalEvents.map((slot) => ({
      slot,
      status: 'external' as const,
    }));

    this.busySlots = [...mappedBookings, ...mappedExternal].sort(
      (a, b) =>
        a.slot.toPrimitives().start.getTime() -
        b.slot.toPrimitives().start.getTime(),
    );
  }

  public canBook(requestedSlot: TimeSlot): boolean {
    return !this.busySlots.some((busy) => busy.slot.overlaps(requestedSlot));
  }

  public getTimeline(dayStart: Date, dayEnd: Date): TimelineBlock[] {
    const timeline: TimelineBlock[] = [];
    let currentPointer = dayStart.getTime();
    const endOfDayTime = dayEnd.getTime();

    for (const busy of this.busySlots) {
      const busyStart = busy.slot.toPrimitives().start.getTime();
      const busyEnd = busy.slot.toPrimitives().end.getTime();

      if (busyEnd <= currentPointer) continue;

      if (busyStart > currentPointer && busyStart <= endOfDayTime) {
        timeline.push({
          slot: new TimeSlot({
            start: new Date(currentPointer),
            end: new Date(busyStart),
          }),
          status: 'available',
        });
      }

      const actualStart = Math.max(currentPointer, busyStart);
      const actualEnd = Math.min(busyEnd, endOfDayTime);

      if (actualStart < actualEnd) {
        timeline.push({
          slot: new TimeSlot({
            start: new Date(actualStart),
            end: new Date(actualEnd),
          }),
          status: busy.status,
        });
      }

      currentPointer = Math.max(currentPointer, actualEnd);
    }

    if (currentPointer < endOfDayTime) {
      timeline.push({
        slot: new TimeSlot({
          start: new Date(currentPointer),
          end: new Date(endOfDayTime),
        }),
        status: 'available',
      });
    }

    return timeline;
  }
}
