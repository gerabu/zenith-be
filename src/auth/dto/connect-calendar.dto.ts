import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConnectCalendarDto {
  @ApiProperty({
    example: 'ya29.a0Af...',
    description: 'Google OAuth access token granting calendar access.',
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({
    required: false,
    example: '1//0gFh...',
    description: 'Google OAuth refresh token, when offline access was granted.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}
