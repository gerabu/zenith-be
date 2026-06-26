import { ApiProperty } from '@nestjs/swagger';
import { Booking } from '@prisma/client';

export class BookingResponseDto {
  @ApiProperty({ example: 'ckk0...', description: 'Booking identifier.' })
  public readonly id: string;

  @ApiProperty({
    example: 'ckk0...',
    description: 'Identifier of the user who owns the booking.',
  })
  public readonly userId: string;

  @ApiProperty({
    example: 'Dentist appointment',
    description: 'Booking title.',
  })
  public readonly title: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-06-25T09:00:00.000Z',
    description: 'Inclusive start of the booking (ISO 8601).',
  })
  public readonly startTime: Date;

  @ApiProperty({
    format: 'date-time',
    example: '2026-06-25T10:00:00.000Z',
    description: 'Exclusive end of the booking (ISO 8601).',
  })
  public readonly endTime: Date;

  @ApiProperty({
    format: 'date-time',
    example: '2026-06-20T14:30:00.000Z',
    description: 'When the booking was created.',
  })
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
