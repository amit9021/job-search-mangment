---
id: chunk-backend-auth
title: Backend · Auth HTTP + Service
module: backend-auth
generated_at: 2025-02-14T08:00:00.000Z
tags: ["api","service"]
source_paths: ["backend/src/modules/auth/auth.controller.ts","backend/src/modules/auth/auth.service.ts"]
exports: ["AuthController","AuthProfile","AuthService","AuthTokens"]
imports: ["../../common/decorators/public.decorator","../../common/decorators/user.decorator","../../common/rate-limit/rate-limit.decorator","../../common/rate-limit/rate-limit.guard","../../prisma/prisma.service","./auth.service","./dto/login.dto","./dto/register.dto","@nestjs/common","@nestjs/config","@nestjs/jwt","bcryptjs"]
tokens_est: 372
---

### Summary
- `/auth/register` creates bcrypt-hashed users (idempotent on duplicate emails) and returns the minimal profile.
- `/auth/login` issues 7-day JWTs plus `{ accessToken, exp }`; `/auth/logout` stays stateless.
- `/auth/me` simply returns the `JwtStrategy` profile so the frontend can hydrate session state.

### Key API / Logic

### Operational Notes

**Invariants**
- Passwords are hashed with bcrypt using the configured rounds; JWTs expire after ~7 days.
- Rate limit guard throttles register/login per IP to mitigate brute-force.

**Failure modes**
- Invalid credentials raise UnauthorizedException (401).
- Missing JWT secret/expiry or misconfigured bcrypt rounds will break token issuance.

**Extension tips**
- Implement OAuth providers by honoring AuthProvider interface and flipping AUTH_OAUTH_ENABLED.
- Add refresh tokens/blacklists by extending AuthService + controller responses.

#### backend/src/modules/auth/auth.controller.ts

```ts
export class AuthController {
  @Public()
    @UseGuards(RateLimitGuard)
    @RateLimit({ keyPrefix: 'auth:register' })
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    register(@Body() body: RegisterDto) {
      return this.authService.register(body.email, body.password);
    }

  @Public()
    @UseGuards(RateLimitGuard)
    @RateLimit({ keyPrefix: 'auth:login' })
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: LoginDto) {
      return this.authService.login(body.email, body.password);
    }

  @Post('logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    async logout() {
      await this.authService.logout();
    }

  @Get('me')
    me(@CurrentUser() user: AuthProfile) {
      return user;
    }
}
```

#### backend/src/modules/auth/auth.service.ts

```ts
export type AuthProfile = {
  id: string;
  email: string;
  createdAt: Date;
};

export type AuthTokens = {
  accessToken: string;
  exp: number;
};

export class AuthService {
  async register(email: string, password: string): Promise<AuthProfile> {
      const normalizedEmail = this.normalizeEmail(email);
      const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        throw new ConflictException('Email already registered');
      }
      const passwordHash = await this.hashPassword(password);
      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash
        }
      });
      await this.claimOrphanedRecords(user.id);
      return this.toProfile(user);
    }

  async login(email: string, password: string): Promise<AuthTokens> {
      const normalizedEmail = this.normalizeEmail(email);
      const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
      await this.claimOrphanedRecords(user.id);
      return this.issueTokens(user.id, user.email);
    }

  logout() {
      return Promise.resolve();
    }

  toProfile(user: { id: string; email: string; createdAt: Date }): AuthProfile {
      return {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt
      };
    }
}
```

### Related
- [chunk-backend-prisma](./chunk-backend-prisma.md)
