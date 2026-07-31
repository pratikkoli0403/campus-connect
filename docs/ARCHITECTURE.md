# Architecture

## System shape

```text
React/Vite browser
  |  Axios REST, Authorization: Bearer JWT
  v
Express application (backend/src/server.js)
  |  controllers -> Prisma Client
  v
PostgreSQL

React clients
  |  Socket.IO handshake auth { token }
  v
Node/Socket.IO server
  |  authorized String(groupId) rooms
  v
other authenticated clients in that group
```

`backend/src/server.js` creates one HTTP server for Express and Socket.IO. REST routes are mounted under `/api`; protected download is deliberately outside that prefix at `/uploads/:filename` and has `authMiddleware`.

## Authentication and authorization lifecycle

```text
LoginPage -> AuthProvider.login()
  -> POST /api/auth/login { rollNo, password }
  -> bcrypt.compare stored hash
  -> JWT { id, role, rollNo }, expires in 7d
  -> token + public user data
  -> localStorage token/user; Axios default Authorization header
```

`AuthContext.jsx` owns the browser auth state and clears it on logout. `auth.middleware.js` parses only `Bearer <token>`, verifies `JWT_SECRET`, and assigns decoded claims to `req.user`. Controllers still look up users/groups where current database state matters. `ProtectedRoute.jsx` checks local storage, but it is **not mounted in `AppRouter.jsx`**; server authorization is therefore the real protection.

Permission policy is centralized in `backend/src/utils/permissions.js`; `getUserGroupAccess()` loads user, group, and membership in parallel. `canAccessGroup()` permits a group member or an admin. Controllers apply additional ownership/role checks after that shared access check.

## Data model and controller responsibilities

Prisma models are `User`, `Group`, join model `GroupMember`, `Message`, `Announcement`, and `File`. A message can carry `fileUrl` and `fileName`; it has no Prisma relation to `File`, so controllers coordinate records by matching URL/group. `User.attendancePercentage` is one numeric value per student, not an attendance session table.

- `auth.controller.js`: register/login/change password.
- `group.controller.js`: group creation, membership, listing, member/attendance data.
- `message.controller.js`: message history and deletion.
- `announcement.controller.js`: announcement CRUD endpoints present in routes (create/list/delete).
- `file.controller.js`: upload/list/delete, including linked attachment message creation/deletion.
- `attendance.controller.js`: own attendance and staff update.
- `studentImport.service.js`: parsing, validation, duplicate checks, user/membership transaction.

Controllers are intentionally thin orchestration layers: validate input, load/check access, make Prisma calls, emit events when applicable, and return JSON. Reusable policy and normalization live in `utils/`.

## Group membership architecture

Groups have `branch`, `year`, and display `name`. `groupMatching.js` normalizes branches to uppercase and accepts years 1–4 or FY/SY/TY/BE. Public student registration attempts to find a matching group; bulk import requires one. `GroupMember` is the source of ordinary group membership. `getMyGroups()` queries that join table; staff do not automatically receive every group in that endpoint, although admins can access group content through `canAccessGroup`.

## Realtime architecture

The client initializes Socket.IO with `autoConnect: false` in `frontend/src/sockets/socket.js`. When `ChatPage` has a user, it sets `socket.auth.token`, connects, registers presence, and emits `joinGroup` when selection changes.

```text
Client joinGroup { groupId }
  -> Socket.IO JWT middleware verifies handshake.auth.token
  -> chat.socket.js getUserGroupAccess(userId, groupId)
  -> socket.join(String(groupId)) only if canAccess
```

### Normal message flow

```text
ChatPage sendMessage
  -> authenticated socket handler
  -> getUserGroupAccess(authenticated user, group)
  -> prisma.message.create(include sender)
  -> io.to(String(groupId)).emit("receiveMessage", message)
  -> ChatPage deduplicates by message id and renders
```

The server ignores the client-supplied sender identity and uses the socket JWT identity. Message history is fetched through REST on group selection; Socket.IO makes new messages immediate.

### Announcement and file flows

```text
Create announcement via REST
  -> authMiddleware + group/role checks
  -> Prisma Announcement
  -> announcement_created to group room

Upload validated multipart file via REST
  -> authMiddleware + group check + Multer disk write
  -> Prisma transaction: File + attachment Message
  -> file_created and receiveMessage to group room
```

`ChatPage.jsx` listens for these events and prevents duplicate IDs. Deletes use equivalent room events. This structure persists state first, then broadcasts it, so a page refresh reconstructs the same view through REST.

## Attendance and import

The attendance UI loads current group members through `GET /api/groups/:groupId/members`; staff receive each member's `attendancePercentage`. Students call `GET /api/attendance/me`. Staff call `PATCH /api/attendance/:userId`; non-admin staff must share at least one group with the student.

The import endpoint uses memory upload, then `studentImport.service.js` parses the first CSV/XLSX sheet, validates required columns/rows, finds a branch/year group, and transactionally creates `User(role: STUDENT)` plus `GroupMember`. It returns imported/skipped counts, row errors, and temporary credentials. After successful import, `ChatPage` increments `membersRefreshKey`, re-running its existing members/attendance fetch for the selected group.

## Secure download flow

```text
File card / chat attachment
  -> fileService.downloadFile(file)
  -> Axios GET backend /uploads/<stored filename>, Bearer JWT, responseType blob
  -> authMiddleware sets req.user
  -> downloadUpload finds File by exact /uploads/name
  -> getUserGroupAccess(req.user.id, file.groupId)
  -> res.download(disk path, original fileName)
  -> browser object URL download
```

The disk name is sanitized/generated by Multer. `path.basename` guards lookup/deletion against path traversal. Files are not exposed with `express.static`.

## Why this shape

REST is used for request/response operations and initial state; Socket.IO is used only when a connected group should learn about a change immediately. Prisma keeps PostgreSQL access typed and centralized. The join model supports one user belonging to many groups, while checks at both HTTP and room-join boundaries prevent a client from selecting a group ID and automatically gaining its data.
