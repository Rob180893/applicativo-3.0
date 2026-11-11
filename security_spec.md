# Security Specification for Firestore Rules

## 1. Data Invariants
1. Unauthenticated users cannot read or write to any path in the database.
2. User profile documents at `/users/{userId}` can only be read and written by the authenticated user whose `request.auth.uid == userId`.
3. An authenticated user cannot create or update a user profile for a different user ID (identity spoofing blocked).
4. Study data at `/users/{userId}/data/{dataId}` belongs strictly to the user with `request.auth.uid == userId`.
5. No user can read, list, update, or delete study data belonging to another user.
6. The `userId` field inside StudyData must match `request.auth.uid`.
7. `createdAt` on UserProfile cannot be mutated after initial creation.
8. Payloads with oversized strings or missing required fields must be rejected.
9. Ghost/shadow fields not declared in the entity schema must be rejected.
10. Default deny on all other paths not explicitly matched (`/{document=**}`).

## 2. The Dirty Dozen Payloads
1. **Unauthenticated Read**: Attempting to read `/users/user_abc` without auth token -> PERMISSION_DENIED.
2. **Unauthenticated Write**: Attempting to write `/users/user_abc` without auth token -> PERMISSION_DENIED.
3. **Cross-User Profile Read**: User `alice` reading `/users/bob` -> PERMISSION_DENIED.
4. **Cross-User Profile Write**: User `alice` writing to `/users/bob` -> PERMISSION_DENIED.
5. **Identity Spoofing in Body**: User `alice` writing to `/users/alice` with body `{ id: "bob" }` -> PERMISSION_DENIED.
6. **Cross-User Study Data Read**: User `alice` reading `/users/bob/data/main` -> PERMISSION_DENIED.
7. **Cross-User Study Data Write**: User `alice` writing `/users/bob/data/main` -> PERMISSION_DENIED.
8. **Study Data UserId Mismatch**: User `alice` writing `/users/alice/data/main` with body `{ userId: "bob" }` -> PERMISSION_DENIED.
9. **Ghost Fields Injection**: User `alice` writing `/users/alice` with extra field `{ isAdmin: true }` -> PERMISSION_DENIED.
10. **Oversized String Attack**: User `alice` writing a `displayName` string with >128 chars -> PERMISSION_DENIED.
11. **Catch-All Default Deny**: User `alice` writing to arbitrary collection `/admin_settings/1` -> PERMISSION_DENIED.
12. **Immutable Field Tampering**: User `alice` updating `/users/alice` with altered `createdAt` timestamp -> PERMISSION_DENIED.
