## 1. Dependencies & env

- [x] 1.1 Add `@nestjs/swagger` and `express-basic-auth` to dependencies (`pnpm add`)
- [x] 1.2 Add optional `SWAGGER_USER` and `SWAGGER_PASSWORD` to `EnvironmentVariables` in `src/config/env.validation.ts` (`@IsOptional()` strings)
- [x] 1.3 Document `SWAGGER_USER`/`SWAGGER_PASSWORD` in `.env.example` (if present) / README env section

## 2. Documentation building blocks (common/)

- [x] 2.1 Create `ErrorResponseDto` (`{ success: false; error: string }`) with `@ApiProperty` metadata
- [x] 2.2 Create `ApiEnvelopeResponse(DtoClass, { status, description, isArray? })` decorator that emits an `allOf` schema of `{ success: true }` + `{ data: $ref(DtoClass) }` (array variant for `isArray`), using `@ApiExtraModels` + `getSchemaPath`
- [x] 2.3 (Optional) Add an `ApiErrorResponse(status, description)` helper that references `ErrorResponseDto`, to keep controllers terse

## 3. Response DTOs & @ApiProperty

- [x] 3.1 Create `TimelineBlockResponseDto` in `availability/` with `@ApiProperty` — mirrors the current wire shape (`{ slot: { start, end }, status, title?, id? }`), non-breaking per the timeline-shape decision
- [x] 3.2 Have `GET /availability/:date` return `TimelineBlockResponseDto[]` (map the domain `TimelineBlock[]` through the DTO)
- [x] 3.3 Add `@ApiProperty` to `UserResponseDto`, `CalendarConnectionResponseDto`, `CalendarConnectionStatusResponseDto`, `BookingResponseDto`
- [x] 3.4 Add `@ApiProperty` to request DTOs `CreateBookingDto` and `ConnectCalendarDto` (types, required flags, examples)

## 4. Controller annotations

- [x] 4.1 `AuthController`: `@ApiTags('auth')`, `@ApiBearerAuth()`, per-route `@ApiOperation` + `ApiEnvelopeResponse` + error responses (200; 400 on PATCH; 401)
- [x] 4.2 `AvailabilityController`: `@ApiTags('availability')`, `@ApiBearerAuth()`, `@ApiOperation`, document `:date` param and `tz` query, `ApiEnvelopeResponse(TimelineBlockResponseDto, { isArray: true })`, errors 400/401/404
- [x] 4.3 `BookingsController`: `@ApiTags('bookings')`, `@ApiBearerAuth()`, `@ApiOperation`, `ApiEnvelopeResponse(BookingResponseDto, { status: 201 })`, errors 400/401/403/404/409 — also documented the `DELETE /bookings/:id` endpoint (204; errors 401/404), discovered present during implementation

## 5. Swagger bootstrap & access control (main.ts)

- [x] 5.1 Build the OpenAPI document with `DocumentBuilder` (title, description, version) and `.addBearerAuth()`
- [x] 5.2 Read `SWAGGER_USER`/`SWAGGER_PASSWORD`; only when **both** are set, mount `express-basic-auth({ challenge: true })` covering `/docs` and `/docs-json`, then `SwaggerModule.setup('docs', app, document)`
- [x] 5.3 When either env var is missing, skip mounting docs entirely (fail-closed)

## 6. Verification

- [x] 6.1 With creds set: `/docs` and `/docs-json` return 401 without/with-wrong creds, and load with correct creds
- [x] 6.2 Without creds set: app boots and `/docs` + `/docs-json` are not mounted (404)
- [x] 6.3 Confirmed in the generated OpenAPI spec: each endpoint shows the `{ success, data }` envelope (`allOf`), the documented error codes, and the bearer-auth security scheme
- [x] 6.4 `pnpm build` and `pnpm lint` pass; existing tests still green (`pnpm test` — 99 passed)
