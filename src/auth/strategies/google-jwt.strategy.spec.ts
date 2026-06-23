import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

// jwks-rsa transitively imports the ESM-only `jose` package, which the
// CommonJS test transform cannot parse. The unit under test (`validate`)
// never invokes the key provider, so stub it out.
jest.mock('jwks-rsa', () => ({ passportJwtSecret: () => () => undefined }));

import { GoogleJwtStrategy } from './google-jwt.strategy';

describe('GoogleJwtStrategy', () => {
  const config = {
    get: (key: string) =>
      key === 'GOOGLE_CLIENT_ID' ? 'test-client-id' : undefined,
  } as unknown as ConfigService;

  const strategy = new GoogleJwtStrategy(config);

  describe('validate', () => {
    it('maps verified claims to the authenticated principal', () => {
      const result = strategy.validate({
        sub: 'google-sub-123',
        email: 'user@example.com',
        name: 'Ada Lovelace',
      });

      expect(result).toEqual({
        googleId: 'google-sub-123',
        email: 'user@example.com',
        name: 'Ada Lovelace',
      });
    });

    it('allows a missing optional name', () => {
      const result = strategy.validate({
        sub: 'google-sub-123',
        email: 'user@example.com',
      });

      expect(result.name).toBeUndefined();
      expect(result.googleId).toBe('google-sub-123');
    });

    it('rejects a token missing the subject claim', () => {
      expect(() =>
        strategy.validate({ sub: '', email: 'user@example.com' }),
      ).toThrow(UnauthorizedException);
    });

    it('rejects a token missing the email claim', () => {
      expect(() => strategy.validate({ sub: 'google-sub-123' })).toThrow(
        UnauthorizedException,
      );
    });
  });
});
