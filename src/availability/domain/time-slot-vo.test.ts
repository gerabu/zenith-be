import { describe, expect, it } from "vitest";
import { TimeSlot } from "./time-slot.vo";

describe("TimeSlot", () => {
  it("creates a slot when end is after start", () => {
    expect(
      () =>
        new TimeSlot({
          start: new Date("1975-09-15T14:00:00"),
          end: new Date("1975-09-15T14:45:00"),
        }),
    ).not.toThrow();
  });

  it("creates a slot of exactly two hours", () => {
    expect(
      () =>
        new TimeSlot({
          start: new Date("1975-09-15T14:00:00"),
          end: new Date("1975-09-15T16:00:00"),
        }),
    ).not.throw();
  });

  it("rejects a slot that ends before it starts", () => {
    expect(
      () =>
        new TimeSlot({
          start: new Date("2026-06-10"),
          end: new Date("2026-06-09"),
        }),
    ).toThrow("must end after it starts");
  });

  it("rejects a zero-duration slot", () => {
    expect(
      () =>
        new TimeSlot({
          start: new Date("2026-06-12T14:00:00"),
          end: new Date("2026-06-12T14:00:00"),
        }),
    ).toThrow("A time slot must have a duration greater than zero");
  });

  it("rejects a slot longer than two hours", () => {
    expect(
      () =>
        new TimeSlot({
          start: new Date("2026-06-12T14:00:00"),
          end: new Date("2026-06-12T17:00:00"),
        }),
    ).toThrow(/cannot exceed 2 hours/);
  });

  describe("overlaps", () => {
    const slot = (start: string, end: string) =>
      new TimeSlot({
        start: new Date(`1995-04-24T${start}:00`),
        end: new Date(`1995-04-24T${end}:00`),
      });

    // no overlap
    it("does not overlap a slot that starts after it ends", () => {
      expect(slot("14:00", "16:00").overlaps(slot("17:00", "17:45"))).toBe(
        false,
      );
    });

    it("does not overlap a slot that ends before it starts", () => {
      expect(slot("14:00", "16:00").overlaps(slot("13:00", "13:45"))).toBe(
        false,
      );
    });

    it("does not overlap a slot that starts exactly when it ends", () => {
      expect(slot("14:00", "16:00").overlaps(slot("16:00", "17:45"))).toBe(
        false,
      );
    });

    it("does not overlap a slot that ends exactly when it starts", () => {
      expect(slot("14:00", "16:00").overlaps(slot("13:00", "14:00"))).toBe(
        false,
      );
    });

    // overlap
    it("overlaps a slot that starts in its middle", () => {
      expect(slot("14:00", "16:00").overlaps(slot("14:30", "16:30"))).toBe(
        true,
      );
    });

    it("overlaps a slot that ends in its middle", () => {
      expect(slot("14:00", "16:00").overlaps(slot("12:30", "14:30"))).toBe(
        true,
      );
    });

    it("overlaps a slot fully contained within it", () => {
      expect(
        slot("14:00", "16:00").overlaps(slot("14:30", "15:55")),
      ).toBe(true);
    });

    it("overlaps an identical slot", () => {
      expect(slot("14:00", "16:00").overlaps(slot("14:00", "16:00"))).toBe(
        true,
      );
    });
  });
});
