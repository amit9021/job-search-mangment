import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { RequestContextService } from '../context/request-context.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly requestContext: RequestContextService
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(
    err: unknown,
    user: { id?: string; email?: string } | null,
    info: unknown,
    ctx: ExecutionContext
  ) {
    const result = super.handleRequest(err, user, info, ctx);
    if (!result || typeof result.id !== 'string') {
      throw err ?? new UnauthorizedException('User context missing');
    }
    this.requestContext.setUser(result);
    return result;
  }
}
