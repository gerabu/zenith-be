import { Booking } from '@prisma/client';

export class BookingResponseDto {
  public readonly id: string;
  public readonly userId: string;
  public readonly title: string;
  public readonly startTime: Date;
  public readonly endTime: Date;
  public readonly createdAt: Date;

  private constructor({
    id,
    userId,
    title,
    startTime,
    endTime,
    createdAt,
  }: {
    id: string;
    userId: string;
    title: string;
    startTime: Date;
    endTime: Date;
    createdAt: Date;
  }) {
    this.id = id;
    this.userId = userId;
    this.title = title;
    this.startTime = startTime;
    this.endTime = endTime;
    this.createdAt = createdAt;
  }

  static fromBooking(booking: Booking): BookingResponseDto {
    return new BookingResponseDto({
      id: booking.id,
      userId: booking.userId,
      title: booking.title,
      startTime: booking.startTime,
      endTime: booking.endTime,
      createdAt: booking.createdAt,
    });
  }
}
