import { randomUUID } from 'node:crypto';

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodError } from 'zod';

import { RequestContextService } from '../context/request-context.service';

const REQUEST_ID_HEADER = 'x-request-id';
const REDACTED_VALUE = '[REDACTED]';
const CIRCULAR_VALUE = '[Circular]';
const SENSITIVE_FIELDS = new Set(['authorization', 'password']);

type PrismaKnownError = Error & {
  code: string;
  meta?: Record<string, unknown>;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly requestContext: RequestContextService) {}

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
        const {
          statusCode: _ignoredStatusCode,
          error: _ignoredError,
          message: _ignoredMessage,
          ...rest
        } = payload;
        if (Object.keys(rest).length > 0) {
          details = rest;
        }
      }
    } else if (isPrismaKnownError(exception)) {
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

    const contextRequestId = this.requestContext.getRequestId();
    const requestIdHeader = extractRequestId(request.headers[REQUEST_ID_HEADER]);
    const requestId = contextRequestId ?? requestIdHeader ?? randomUUID();

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
    response.setHeader(REQUEST_ID_HEADER, requestId);
    const sanitizedDetails = details ? sanitize(details) : undefined;
    const logPayload: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level: 'error',
      context: HttpExceptionFilter.name,
      requestId,
      method: request.method,
      path: request.url,
      status,
      message,
      errorCode,
      errorName: exception instanceof Error ? exception.name : typeof exception,
      userId: this.requestContext.getUserId() ?? undefined,
      details: sanitizedDetails
    };

    if (!sanitizedDetails) {
      delete logPayload.details;
    }
    if (!errorCode) {
      delete logPayload.errorCode;
    }
    this.logger.error(safeStringify(logPayload), stack);

    response.status(status).json(responseBody);
  }
}

function isPrismaKnownError(error: unknown): error is PrismaKnownError {
  if (!(error instanceof Error)) {
    return false;
  }
  const maybeWithCode = error as { code?: unknown };
  if (typeof maybeWithCode.code !== 'string') {
    return false;
  }
  const constructorName = error.constructor?.name ?? '';
  if (constructorName !== 'PrismaClientKnownRequestError') {
    return false;
  }
  const metaValue = (error as { meta?: unknown }).meta;
  if (metaValue && typeof metaValue !== 'object') {
    return false;
  }
  return true;
}

function extractRequestId(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    const candidate = value.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
    return candidate?.trim();
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function sanitize(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (isUnknownArray(value)) {
    if (seen.has(value)) {
      return CIRCULAR_VALUE;
    }
    seen.add(value);
    return value.map((entry) => sanitize(entry, seen));
  }
  if (isPlainObject(value)) {
    if (seen.has(value)) {
      return CIRCULAR_VALUE;
    }
    seen.add(value);
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
        result[key] = REDACTED_VALUE;
        continue;
      }
      result[key] = sanitize(val, seen);
    }
    return result;
  }
  return value;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function safeStringify(payload: Record<string, unknown>) {
  const replacer = (_key: string, val: unknown) => {
    if (typeof val === 'bigint') {
      return val.toString();
    }
    return val;
  };
  return JSON.stringify(payload, replacer);
}
