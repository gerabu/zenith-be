import { ApiProperty } from '@nestjs/swagger';
import type { SlotStatus, TimelineBlock } from '../domain/daily-availability';

class TimeSlotDto {
  @ApiProperty({
    format: 'date-time',
    example: '2026-06-25T09:00:00.000Z',
    description: 'Inclusive start of the block (ISO 8601).',
  })
  start: string;

  @ApiProperty({
    format: 'date-time',
    example: '2026-06-25T10:00:00.000Z',
    description: 'Exclusive end of the block (ISO 8601).',
  })
  end: string;
}

export class TimelineBlockResponseDto {
  @ApiProperty({
    type: TimeSlotDto,
    description: 'The time range of the block.',
  })
  slot: TimeSlotDto;

  @ApiProperty({
    enum: ['available', 'booked', 'external'],
    example: 'booked',
    description:
      'Whether the block is free, taken by a Zenith booking, or by an external calendar event.',
  })
  status: SlotStatus;

  @ApiProperty({
    required: false,
    example: 'Standup',
    description:
      'Title of the booking or external event; absent for available blocks.',
  })
  title?: string;

  @ApiProperty({
    required: false,
    example: 'ckk0...',
    description: 'Identifier of the underlying booking, when applicable.',
  })
  id?: string;

  static fromDomain(block: TimelineBlock): TimelineBlockResponseDto {
    const { start, end } = block.slot.toPrimitives();
    const dto = new TimelineBlockResponseDto();
    dto.slot = { start: start.toISOString(), end: end.toISOString() };
    dto.status = block.status;
    if (block.title !== undefined) dto.title = block.title;
    if (block.id !== undefined) dto.id = block.id;
    return dto;
  }
}
