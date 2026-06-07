# Impersonation / View as Member Feature

This plan designs and implements the "View as Member" (Impersonation) feature, allowing workspace Admins to view the client application as a specific member. It leverages the multi-port cookie-sharing behavior of `localhost` (and shared top-level domains in production) by setting client-scoped cookies (`access_token_client` and `refresh_token_client`) from an Admin session, followed by a redirection to the client application.

## Security & Scope Isolation

- The impersonation is fully verified on the API: only users with the `ADMIN` role in the active workspace can invoke impersonation.
- The target member must belong to the active workspace.
- The client cookies (`access_token_client`, `refresh_token_client`) are set to the target user's identity, but carry the `impersonatorId` field in the JWT payload.
- Admin session cookies (`access_token_admin`, `refresh_token_admin`) remain completely untouched. This allows the admin to switch back instantly without logging in again.

## Client-Side Storage Sync

- Next.js client and admin apps use separate local storage ports (3000 vs 3002).
- When the admin is redirected to `http://localhost:3000?impersonate=true`, we check for the `impersonate=true` query parameter.
- If present, we proactively clear any stale client local storage tokens (preventing cached admin tokens on port 3000 from overriding the cookies) and trigger a silent refresh using `tryRefreshSession()`. This reads the newly-set `refresh_token_client` cookie, authenticates the session, and populates the client local storage with the member session.

---

## Proposed Changes

### Shared Contracts Component

We will define new routes and extend the DTO models to support impersonation fields.

#### [routes.ts](file:///Users/chamal/Desktop/ChronoMint/packages/contracts/src/routes.ts)

- Add `IMPERSONATE` and `STOP_IMPERSONATION` endpoint definitions to the `ROUTES.AUTH` object.

```typescript
  AUTH: {
    ...
    IMPERSONATE: "/auth/impersonate",
    STOP_IMPERSONATION: "/auth/stop-impersonation"
  }
```

#### [auth.dto.ts](file:///Users/chamal/Desktop/ChronoMint/packages/contracts/src/dto/auth.dto.ts)

- Update `authSessionSchema` to support optional impersonation audit fields:

```typescript
export const authSessionSchema = z.object({
  user: authUserSchema,
  workspaceId: uuidSchema,
  workspaceName: z.string().min(1).max(120).optional(),
  workspaceRole: workspaceRoleSchema,
  impersonatorId: uuidSchema.optional(),
  impersonatorName: z.string().optional()
});
```

- Define `impersonateSchema` and export the type:

```typescript
export const impersonateSchema = z.object({
  userId: uuidSchema
});
export type ImpersonateDto = z.infer<typeof impersonateSchema>;
```

---

### NestJS Backend API

We will add checks, support impersonator details in token signing, cookie generation, and token rotation, and implement the endpoints.

#### [jwt-auth.guard.ts](file:///Users/chamal/Desktop/ChronoMint/apps/api/src/common/guards/jwt-auth.guard.ts)

- Propagate `impersonatorId` from JWT payload onto the request user object if present.

```typescript
req.user = {
  userId: payload.sub ?? payload.userId,
  workspaceId,
  role: payload.role,
  impersonatorId: payload.impersonatorId
};
```

#### [current-user.decorator.ts](file:///Users/chamal/Desktop/ChronoMint/apps/api/src/common/decorators/current-user.decorator.ts)

- Add `impersonatorId` to `RequestUser` interface:

```typescript
export interface RequestUser {
  userId: string;
  workspaceId: string;
  role: "ADMIN" | "MEMBER";
  impersonatorId?: string;
}
```

#### [auth.service.ts](file:///Users/chamal/Desktop/ChronoMint/apps/api/src/modules/auth/application/auth.service.ts)

- Support `impersonatorId` on `signAccessToken` and `signAndStoreRefreshToken`.
- Retain `impersonatorId` context during refresh token rotation.
- Retrieve the admin user's name on `getMe` and return both `impersonatorId` and `impersonatorName` in `buildSession` so the Client application can display them.

#### [auth.controller.ts](file:///Users/chamal/Desktop/ChronoMint/apps/api/src/modules/auth/interface/http/auth.controller.ts)

- Implement `POST /auth/impersonate` endpoint:
  1. Guard with `UseGuards(JwtAuthGuard)`.
  2. Confirm requester is `ADMIN` in the active workspace.
  3. Confirm the target user is a member of the same workspace.
  4. Generate and store client-scoped tokens (access & refresh) for the target user with the admin's `impersonatorId` payload field.
  5. Set `access_token_client` and `refresh_token_client` cookies.
  6. Return target session structure.
- Implement `POST /auth/stop-impersonation` endpoint:
  1. Clear the `access_token_client` and `refresh_token_client` cookies.
  2. Revoke the client refresh token in the DB.

---

### Next.js Admin App

We will add a "View as Member" action to the members workspace tab.

#### [workspace-page.tsx](file:///Users/chamal/Desktop/ChronoMint/apps/admin/src/features/workspace/workspace-page.tsx)

- Add a column to the members table with a "View as member" button.
- Make the button disabled for the current logged-in user themselves.
- Execute `POST /auth/impersonate` upon clicking, then redirect the window to the Client application URL (defaulting to `http://localhost:3000`).

---

### Next.js Client App

We will support silent refresh on empty local storage, and implement the visual impersonation banner.

#### [workspace-shell.tsx](file:///Users/chamal/Desktop/ChronoMint/apps/client/src/components/workspace-shell.tsx)

- Update `useEffect` load-session effect:
  - If local access token is not present, call `tryRefreshSession()` first.
  - If silent refresh yields a token, continue session restoration. Otherwise, redirect to `/login`.
- If `session.impersonatorId` is present, display a sleek, floating glassmorphism banner at the top of the main page content:
  - Text: `"👁️ Viewing as [Member Name] (impersonated by Admin [Admin Name])"`
  - Action button: `"Return to Admin"`
- Clicking "Return to Admin" calls `POST /auth/stop-impersonation` on the API, clears local storage using `useSessionStore.getState().clear()`, and redirects the window back to the Admin console URL (defaulting to `http://localhost:3002/workspace`).

---

## Verification Plan

### Automated Tests

- Build all packages (`pnpm build`) and run typechecks (`pnpm typecheck`).

### Manual Verification

1. Login as Admin in Admin application (`http://localhost:3002`).
2. Go to Workspace Settings -> Members & Invites.
3. Click "View as member" next to a standard member.
4. Verify redirection to `http://localhost:3000/timer`.
5. Verify the Client application logs in automatically as the target member, and shows the live workspace matching their logs.
6. Verify a prominent yellow/amber banner is displayed at the top showing the impersonator details.
7. Click "Return to Admin" in the banner.
8. Verify cookies are cleared, the Client workspace is logged out, and redirection returns user to `http://localhost:3002/workspace` with the admin still logged in.
