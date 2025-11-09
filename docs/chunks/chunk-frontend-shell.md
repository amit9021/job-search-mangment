---
id: chunk-frontend-shell
title: Frontend · Shell & Session
module: frontend-shell
generated_at: 2025-11-09T08:03:21.008Z
tags: ["ui","state"]
source_paths: ["frontend/src/App.tsx","frontend/src/layouts/ShellLayout.tsx","frontend/src/stores/session.ts"]
exports: ["SessionUser","ShellLayout","useSessionStore"]
imports: ["../api/hooks","../components/NextActionCard","../stores/session","./layouts/ShellLayout","./pages/ContactsPage","./pages/DashboardPage","./pages/GrowPage","./pages/JobsPage","./pages/LoginPage","./pages/TasksPage","./stores/session","react-router-dom","zustand","zustand/middleware"]
tokens_est: 153
---

### Summary
- Router gating around Zustand session store and shared shell layout.

### Key API / Logic

### Operational Notes

**Invariants**
- Auth gating depends on Zustand session store; always update store before navigating.
- ShellLayout assumes routes provide Outlet-friendly children.

**Failure modes**
- Missing token redirects to /login immediately.
- Adding new routes without ShellLayout updates may leave nav links stale.

**Extension tips**
- Add new pages by registering routes + nav items together.
- Keep lazy imports chunked if route bundles grow.

#### frontend/src/App.tsx

```ts
export default function App() {
  const token = useSessionStore((state) => state.token);

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />}
```

#### frontend/src/layouts/ShellLayout.tsx

```ts

```

#### frontend/src/stores/session.ts

```ts
export type SessionUser = {
  id: string;
  username: string;
};
```

### Related
- [chunk-frontend-api](./chunk-frontend-api.md)
