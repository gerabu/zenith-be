import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConnectCalendarDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  refreshToken?: string;
}
