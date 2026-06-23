import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

export const GOOGLE_JWT_STRATEGY = 'google-jwt';

const DEFAULT_GOOGLE_ISSUER = 'https://accounts.google.com';
const DEFAULT_GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';

interface GoogleIdTokenPayload {
  sub: string;
  email?: string;
  name?: string;
}

@Injectable()
export class GoogleJwtStrategy extends PassportStrategy(
  Strategy,
  GOOGLE_JWT_STRATEGY,
) {
  constructor(config: ConfigService) {
    const issuer = config.get<string>('GOOGLE_ISSUER') ?? DEFAULT_GOOGLE_ISSUER;
    const jwksUri =
      config.get<string>('GOOGLE_JWKS_URI') ?? DEFAULT_GOOGLE_JWKS_URI;
    const audience = config.get<string>('GOOGLE_CLIENT_ID');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      // Google may stamp either of these as the issuer.
      issuer: [issuer, 'accounts.google.com'],
      audience,
      // Tolerate minor clock drift between this host and Google.
      jsonWebTokenOptions: { clockTolerance: 30 },
      // Cache Google's rotating public keys to avoid a per-request round-trip.
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri,
      }),
    });
  }

  // Runs only after signature/issuer/audience/expiry pass. Claims only, no DB.
  validate(payload: GoogleIdTokenPayload): AuthenticatedUser {
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Token missing required claims');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  }
}
