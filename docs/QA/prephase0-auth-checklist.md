# QA Checklist – Prephase0 Auth

### API
- [ ] `POST /auth/register` → 201, body matches `{ id, email, createdAt }`, duplicate email returns 409.
- [ ] `POST /auth/login` → 200 with `{ accessToken, exp }`, bcrypt compare fails with 401 for bad password.
- [ ] `POST /auth/logout` → 204 regardless of session state.
- [ ] `GET /auth/me` → 200 only with valid Bearer token, 401 otherwise.
- [ ] Rate limit triggers on >`RATE_LIMIT_MAX` attempts/min (verify `Retry-After` header).

### Persistence / Seeds
- [ ] `npm run --prefix backend prisma:seed` creates the bootstrap user defined by `ADMIN_EMAIL`.
- [ ] Prisma migration renames `User.username` → `User.email` without losing existing data.

### Frontend UX
- [ ] Login form rejects invalid emails and passwords shorter than 8 chars.
- [ ] Register form enforces matching passwords, displays toast after success, and allows immediate login.
- [ ] `ProtectedRoute` gates `/` and child routes—unauthenticated users are redirected to `/login`.
- [ ] Reloading the app with an expired or tampered token clears the session automatically.
- [ ] User chip shows the current email and logs out successfully.

### Regression
- [ ] Existing modules still honor JWT guard (sample request to `/jobs` fails with 401 when token missing).
- [ ] Docs (`docs/AUTH.md`, `docs/ENV.md`, config reference) reflect the new variables and flows.
