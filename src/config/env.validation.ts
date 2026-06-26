import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

// Validated at boot so a missing/invalid var fails startup, not at runtime.
export class EnvironmentVariables {
  @IsNotEmpty()
  @IsString()
  DATABASE_URL!: string;

  @IsNotEmpty()
  @IsString()
  GOOGLE_CLIENT_ID!: string;

  @IsNotEmpty()
  @IsString()
  GOOGLE_CLIENT_SECRET!: string;

  @IsOptional()
  @IsString()
  GOOGLE_ISSUER?: string;

  @IsOptional()
  @IsString()
  GOOGLE_JWKS_URI?: string;

  // Optional Basic-Auth credentials gating the Swagger docs. When either is
  // unset the docs routes are not mounted at all (fail-closed).
  @IsOptional()
  @IsString()
  SWAGGER_USER?: string;

  @IsOptional()
  @IsString()
  SWAGGER_PASSWORD?: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration:\n${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  return validated;
}
