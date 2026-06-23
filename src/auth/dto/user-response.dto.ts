import { User } from '@prisma/client';

export class UserResponseDto {
  public readonly id: string;
  public readonly email: string;
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
