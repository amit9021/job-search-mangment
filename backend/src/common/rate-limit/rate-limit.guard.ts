import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

import { RATE_LIMIT_METADATA_KEY, type RateLimitOptions } from './rate-limit.decorator';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService
  ) {}

  canActivate(context: ExecutionContext) {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!options) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { ip?: string }>();
    const response = http.getResponse<Response>();

    const ip =
      (request.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      request.ip ??
      request.socket?.remoteAddress ??
      'unknown';

    const key = `${options.keyPrefix}:${ip}`;
    const result = this.rateLimitService.hit(key, options.max, options.windowMs);

    if (!result.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
      if (response && typeof response.setHeader === 'function') {
        response.setHeader('Retry-After', retryAfterSeconds.toString());
      }
      throw new HttpException('Too many attempts, try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
