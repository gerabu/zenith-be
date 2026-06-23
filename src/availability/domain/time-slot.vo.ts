const TIME_SLOT_MAX_HOURS = 24;
const TIME_SLOT_MIN_MINUTES = 15;

type TimeSlotProps = {
  start: Date;
  end: Date;
};

export class TimeSlot {
  private readonly start: Date;
  private readonly end: Date;

  constructor(props: TimeSlotProps) {
    if (props.end.getTime() === props.start.getTime()) {
      throw new Error('A time slot must have a duration greater than zero');
    }

    if (props.end < props.start) {
      throw new Error(
        `A time slot must end after it starts (start: ${props.start.toISOString()}, end: ${props.end.toISOString()})`,
      );
    }

    const hours =
      (props.end.getTime() - props.start.getTime()) / (1000 * 60 * 60);

    if (hours > TIME_SLOT_MAX_HOURS) {
      throw new Error(
        `A time slot cannot exceed ${TIME_SLOT_MAX_HOURS} hours (got ${hours})`,
      );
    }

    const durationMins = (props.end.getTime() - props.start.getTime()) / 60000;
    if (durationMins < TIME_SLOT_MIN_MINUTES) {
      throw new Error(`A time slot cannot be less than ${TIME_SLOT_MIN_MINUTES} minutes (got ${durationMins})`);
    }

    this.start = props.start;
    this.end = props.end;
  }

  overlaps(other: TimeSlot): boolean {
    return this.start < other.end && other.start < this.end;
  }

  toPrimitives() {
    return {
      start: new Date(this.start.getTime()),
      end: new Date(this.end.getTime()),
    };
  }
}
