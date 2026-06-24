import { validate } from 'class-validator';
import { ConnectCalendarDto } from './connect-calendar.dto';

function make(overrides: Partial<ConnectCalendarDto>): ConnectCalendarDto {
  return Object.assign(new ConnectCalendarDto(), overrides);
}

describe('ConnectCalendarDto', () => {
  it('is valid with accessToken and refreshToken', async () => {
    const errors = await validate(
      make({ accessToken: 'at', refreshToken: 'rt' }),
    );
    expect(errors).toHaveLength(0);
  });

  it('is valid with only accessToken (refreshToken optional)', async () => {
    const errors = await validate(make({ accessToken: 'at' }));
    expect(errors).toHaveLength(0);
  });

  it('is invalid when accessToken is missing', async () => {
    const errors = await validate(make({}));
    const fields = errors.map((e) => e.property);
    expect(fields).toContain('accessToken');
  });

  it('is invalid when accessToken is an empty string', async () => {
    const errors = await validate(make({ accessToken: '' }));
    const fields = errors.map((e) => e.property);
    expect(fields).toContain('accessToken');
  });

  it('is invalid when refreshToken is an empty string', async () => {
    const errors = await validate(
      make({ accessToken: 'at', refreshToken: '' }),
    );
    const fields = errors.map((e) => e.property);
    expect(fields).toContain('refreshToken');
  });
});
