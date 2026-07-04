import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? (body as Record<string, unknown>).message
        : body;

    const code =
      typeof body === 'object' && body !== null && 'code' in body
        ? (body as Record<string, unknown>).code
        : `HTTP_${status}`;

    const detail =
      typeof body === 'object' && body !== null && 'detail' in body
        ? (body as Record<string, unknown>).detail
        : undefined;

    response.status(status).json({
      error: {
        code,
        message,
        ...(detail !== undefined ? { detail } : {}),
        requestId: request.headers['x-request-id'],
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
