---
id: chunk-backend-auth
title: Backend · Auth HTTP + Service
module: backend-auth
generated_at: 2025-11-09T09:09:06.471Z
tags: ["api","service"]
source_paths: ["backend/src/modules/auth/auth.controller.ts","backend/src/modules/auth/auth.service.ts"]
exports: ["AuthController","AuthService"]
imports: ["../../common/decorators/public.decorator","../../common/decorators/user.decorator","../../prisma/prisma.service","./auth.service","./dto/login.dto","@nestjs/common","@nestjs/config","@nestjs/jwt"]
tokens_est: 308
---

### Summary
- POST /auth/login validates env-managed admin credentials and mints JWT tokens.
- GET /auth/me returns the injected @CurrentUser detail for nav/session bootstrap.
- Service upserts the admin User row before issuing tokens to keep analytics alive.

### Key API / Logic

### Operational Notes

**Invariants**
- Only the admin credentials defined via env/ConfigService are accepted; no multi-user state.
- Prisma upsert guarantees the backing User row exists for audit/logging.

**Failure modes**
- Invalid credentials raise UnauthorizedException, surfacing as HTTP 401.
- Missing JWT secret or expires-in configuration will produce unsigned/short-lived tokens.

**Extension tips**
- Add new login flows by expanding AuthService and wiring additional DTO validation.
- Keep JwtStrategy/guards aligned with any changes to the session payload.

#### backend/src/modules/auth/auth.controller.ts

```ts
export class AuthController {
  @Public()
    @Post('login')
    async login(@Body() body: LoginDto) {
      return this.authService.login(body.username, body.password);
    }

  @Get('me')
    me(@CurrentUser() user: { username: string }) {
      return user;
    }
}
```

#### backend/src/modules/auth/auth.service.ts

```ts
export class AuthService {
  async validateUser(username: string, password: string) {
      const adminUsername = (
        this.configService.get<string>('ADMIN_USERNAME') ??
        process.env.ADMIN_USERNAME ??
        'admin'
      ).trim();
      const adminPassword = (
        this.configService.get<string>('ADMIN_PASSWORD') ??
        process.env.ADMIN_PASSWORD ??
        'change_me'
      ).trim();
  
      if (username.trim() !== adminUsername || password.trim() !== adminPassword) {
        throw new UnauthorizedException('Invalid credentials');
      }
  
      // Ensure backing record exists for analytics/auditing purposes
      const user = await this.prisma.user.upsert({
        where: { username: adminUsername },
        update: { passwordHash: 'env_managed' },
        create: {
          username: adminUsername,
          passwordHash: 'env_managed'
        }
      });
  
      return user;
    }

  async login(username: string, password: string) {
      const user = await this.validateUser(username, password);
      await this.claimOrphanedRecords(user.id);
      const payload = { sub: user.id, username: user.username };
      const token = await this.jwtService.signAsync(payload);
      return {
        token,
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '12h'),
        user: {
          id: user.id,
          username: user.username
        }
      };
    }
}
```

### Related
- [chunk-backend-prisma](./chunk-backend-prisma.md)
