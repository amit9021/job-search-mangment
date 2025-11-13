import { randomUUID } from 'node:crypto';

import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { RequestContextService } from '../context/request-context.service';

const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const headerValue = req.headers[REQUEST_ID_HEADER];
    const requestId = this.extractRequestId(headerValue) ?? randomUUID();
    req.headers[REQUEST_ID_HEADER] = requestId;
    (req as Request & { requestId?: string }).requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    this.requestContext.run(() => next(), { requestId });
  }

  private extractRequestId(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
      const candidate = value.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
      return candidate?.trim() ?? null;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return null;
  }
}
