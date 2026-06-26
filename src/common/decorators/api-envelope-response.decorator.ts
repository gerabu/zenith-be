import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

interface EnvelopeOptions {
  status?: number;
  description?: string;
  isArray?: boolean;
}

// Class reference for a model. Matches @nestjs/swagger's own
// ApiExtraModels/getSchemaPath param type so DTOs with private constructors
// (which a `new (...)` signature would reject) are still accepted.
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type ModelRef = Function;

/**
 * Documents a success response as the real wire shape `{ success: true, data }`,
 * where `data` is `$ref(dto)` (or an array of it). Without this, Swagger would
 * document only the unwrapped DTO returned by the controller, omitting the
 * envelope added by ResponseInterceptor.
 */
export function ApiEnvelopeResponse(
  dto: ModelRef,
  { status = 200, description, isArray = false }: EnvelopeOptions = {},
) {
  const dataSchema = isArray
    ? { type: 'array', items: { $ref: getSchemaPath(dto) } }
    : { $ref: getSchemaPath(dto) };

  return applyDecorators(
    ApiExtraModels(dto),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          {
            type: 'object',
            properties: { success: { type: 'boolean', example: true } },
          },
          {
            type: 'object',
            properties: { data: dataSchema },
          },
        ],
      },
    }),
  );
}

/**
 * Documents an error response using the shared `{ success: false, error }`
 * shape produced by HttpExceptionFilter. `example` should be a representative
 * `error` message for this specific status so each response shows an accurate
 * example rather than a single shared one.
 */
export function ApiErrorResponse(
  status: number,
  description: string,
  example: string,
) {
  return applyDecorators(
    ApiResponse({
      status,
      description,
      type: ErrorResponseDto,
      example: { success: false, error: example },
    }),
  );
}
