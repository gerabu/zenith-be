const TIME_SLOT_MAX_HOURS = 2;

type TimeSlotProps = {
  start: Date;
  end: Date;
};

export class TimeSlot {
  private readonly start: Date;
  private readonly end: Date;

  constructor(props: TimeSlotProps) {
    if (props.end.getTime() === props.start.getTime()) {
      throw new Error("A time slot must have a duration greater than zero");
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

    this.start = props.start;
    this.end = props.end;
  }

  overlaps(other: TimeSlot): boolean {
    return this.start < other.end && other.start < this.end;
  }
}
