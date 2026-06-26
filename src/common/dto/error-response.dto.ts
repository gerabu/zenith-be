import { ApiProperty } from '@nestjs/swagger';

// Mirrors the shape produced by HttpExceptionFilter for every error response.
export class ErrorResponseDto {
  @ApiProperty({
    example: false,
    description: 'Always false for error responses.',
  })
  success: false;

  @ApiProperty({
    description:
      'Human-readable description of what went wrong. See each endpoint’s ' +
      'documented responses for status-specific examples.',
  })
  error: string;
}
