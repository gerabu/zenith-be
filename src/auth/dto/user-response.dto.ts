import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 'ckk0...', description: 'Internal user identifier.' })
  public readonly id: string;

  @ApiProperty({
    example: 'jane@example.com',
    description: "The user's Google account email.",
  })
  public readonly email: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Jane Doe',
    description: 'Display name from Google, or null if unavailable.',
  })
  public readonly name: string | null;

  private constructor({
    id,
    email,
    name,
  }: {
    id: string;
    email: string;
    name: string | null;
  }) {
    this.id = id;
    this.email = email;
    this.name = name;
  }

  static fromUser(user: User): UserResponseDto {
    return new UserResponseDto({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  }
}
