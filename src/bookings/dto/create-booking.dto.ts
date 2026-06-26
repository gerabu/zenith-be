import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    example: 'Dentist appointment',
    description: 'Name of the time slot to book.',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-06-25T09:00:00.000Z',
    description: 'Inclusive start of the booking (ISO 8601).',
  })
  @IsISO8601()
  startTime: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-06-25T10:00:00.000Z',
    description: 'Exclusive end of the booking (ISO 8601).',
  })
  @IsISO8601()
  endTime: string;
}
