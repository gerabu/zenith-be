# api-response-envelope Specification

## Purpose

Enforce a uniform `{ success, data?, error? }` shape on every HTTP response in the system via a global NestJS interceptor (for success paths) and a global exception filter (for error paths), so that controllers and services return plain values without knowing the envelope format.

## Requirements

### Requirement: All successful responses are wrapped in the success envelope

The system SHALL wrap every successful HTTP response in `{ success: true, data: <value> }`, where `<value>` is the plain object or array returned by the controller handler. This SHALL be enforced globally by a `ResponseInterceptor` registered in `main.ts`. Individual controllers and services SHALL NOT construct the envelope themselves.

#### Scenario: Controller returns a plain value

- **WHEN** a protected controller handler returns a plain object or array
- **THEN** the HTTP response body is `{ "success": true, "data": <that object or array> }`
- **AND** the HTTP status code is set by the handler (defaulting to 200 if not specified)

#### Scenario: Controller returns null or undefined

- **WHEN** a controller handler returns `null` or `undefined` (e.g. a delete that returns nothing)
- **THEN** the HTTP response body is `{ "success": true, "data": null }`

### Requirement: All error responses are wrapped in the error envelope

The system SHALL wrap every error response in `{ success: false, error: <message> }`, where `<message>` is a human-readable string. This SHALL be enforced globally by an `HttpExceptionFilter` registered in `main.ts`. The filter SHALL handle both `HttpException` subclasses (using their message) and unhandled errors (using a generic "Internal server error" message). The `data` field SHALL be omitted from error responses.

#### Scenario: NestJS HttpException is thrown

- **WHEN** a service or guard throws an `HttpException` (e.g. `NotFoundException`, `UnauthorizedException`, `BadRequestException`)
- **THEN** the HTTP response body is `{ "success": false, "error": <exception message> }`
- **AND** the HTTP status code matches the exception's status code

#### Scenario: Unhandled error propagates

- **WHEN** an unexpected error (not an `HttpException`) is thrown anywhere in the request pipeline
- **THEN** the HTTP response body is `{ "success": false, "error": "Internal server error" }`
- **AND** the HTTP status code is 500

### Requirement: Mutual exclusivity of data and error fields

In a success response the `error` field SHALL be absent (not null, not undefined — fully omitted from the serialized JSON). In an error response the `data` field SHALL be absent. Both fields SHALL NOT appear in the same response.

#### Scenario: Success response has no error field

- **WHEN** a request succeeds
- **THEN** the JSON response body contains `success` and `data` but does NOT contain an `error` key

#### Scenario: Error response has no data field

- **WHEN** a request fails
- **THEN** the JSON response body contains `success` and `error` but does NOT contain a `data` key

### Requirement: Global ValidationPipe rejects invalid input

The system SHALL register a global `ValidationPipe` (with `whitelist: true` and `forbidNonWhitelisted: true`) in `main.ts` to validate all incoming DTOs. Invalid payloads SHALL be rejected before reaching the controller, and the resulting `400 Bad Request` error SHALL be formatted by the global exception filter.

#### Scenario: Request body fails DTO validation

- **WHEN** a request is made with a body that fails `class-validator` rules on the DTO
- **THEN** the system responds with `400 Bad Request` and `{ "success": false, "error": <validation message> }`
