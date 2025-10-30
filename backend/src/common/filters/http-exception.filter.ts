import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { ZodError } from 'zod';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode: string | undefined;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const payload = exceptionResponse as Record<string, unknown>;
        const responseMessage = payload.message;
        if (typeof responseMessage === 'string') {
          message = responseMessage;
        }
        const { statusCode: _ignoredStatusCode, error: _ignoredError, message: _ignoredMessage, ...rest } = payload;
        if (Object.keys(rest).length > 0) {
          details = rest;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2003':
          status = HttpStatus.CONFLICT;
          message = 'Operation blocked by related records';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Requested resource was not found';
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'Database error';
      }
      errorCode = exception.code;
      if (exception.meta) {
        details = { ...(details ?? {}), meta: exception.meta };
      }
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      details = { errors: exception.flatten() };
      errorCode = 'ZOD_VALIDATION';
    } else if (exception instanceof Error) {
      message = exception.message || message;
    }

    const requestId = request.headers['x-request-id']?.toString() ?? randomUUID();

    const responseBody: Record<string, unknown> = {
      statusCode: status,
      message,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      requestId
    };

    if (errorCode) {
      responseBody.errorCode = errorCode;
    }
    if (details) {
      responseBody.details = details;
    }

    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(
      `${request.method} ${request.url} -> ${status} requestId=${requestId} message=${message}`,
      stack
    );

    response.status(status).json(responseBody);
  }
}
