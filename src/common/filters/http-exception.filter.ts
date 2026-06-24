import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as Record<string, unknown>).message?.toString() ?? exception.message;

      response.status(status).json({ success: false, error: message });
    } else {
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, error: 'Internal server error' });
    }
  }
}
