# Demo and Learning Guide

## Part A — Demonstration sequence

1. **Login:** sign in with roll number and password. Explain that `bcrypt.compare` verifies a hash and the server returns a 7-day JWT used in Authorization headers and Socket.IO handshake auth.
2. **Group access:** show the sidebar and switch groups. Explain `GroupMember` determines ordinary membership and REST/Sockets check that membership.
3. **Realtime chat:** open the same group in two accounts; send a message. The audience sees it instantly because Socket.IO persists the message then broadcasts the group room.
4. **Announcement:** as teacher/admin create an announcement; show the other member receive it without refresh. Explain REST persists it and `announcement_created` updates clients.
5. **File sharing:** upload an allowed file. Show it appears in Files and as a chat attachment. Explain one transaction creates `File` metadata and `Message` attachment.
6. **Secure download:** download from Files or chat. Explain the browser makes an authenticated blob request; backend verifies JWT, looks up the file, checks group access, then sends the original filename.
7. **Attendance:** show a student's own percentage; as teacher open a group attendance list and update a student's value. Explain non-admin staff must share a group with the target student.
8. **Bulk import:** upload CSV/XLSX with `name, rollNo, branch, year`; show per-row results and selected group list refresh. Explain each valid student/membership is a database transaction.
9. **Permissions:** try a student action such as announcement/file deletion or attendance update to show it is refused by backend, not merely hidden in UI.
10. **Password change:** use Settings. Explain the old password is verified before storing a new bcrypt hash.

## Common demo/viva questions

**Why PostgreSQL?** The application has relational data: users, groups, membership, messages, files, and ownership. PostgreSQL fits joins, uniqueness such as roll number, and transactions.

**Why Prisma?** Controllers call Prisma models rather than hand-written SQL. It maps the schema in `backend/prisma/schema.prisma` to database operations and supports transactions used for imports/uploads.

**Why JWT?** REST calls and Socket.IO handshakes need a portable identity. The signed JWT carries id/role/roll number; backend checks it with `JWT_SECRET`.

**Why Socket.IO?** HTTP alone would require polling. Group rooms make realtime message, announcement, file, deletion, typing, and presence updates immediate to relevant connected clients.

**Why React and Express?** React keeps the multi-panel UI stateful; Express provides small route/controller endpoints and shares one Node server with Socket.IO.

**How are passwords stored?** `bcrypt.hash(..., 10)` stores hashes. Login/change-password use `bcrypt.compare`; plaintext passwords are not persisted.

**How are permissions enforced?** `authMiddleware` identifies callers. Controllers use `permissions.js`, `groupAccess.js`, ownership IDs, and group membership. Frontend visibility is only a convenience.

**How are other groups blocked?** REST group endpoints look up membership; Socket.IO `joinGroup` and `sendMessage` call `getUserGroupAccess`; file downloads do the same after File lookup.

**Why is download not public?** A normal public URL would leak shared files. The code uses an authenticated request and `res.download` only after JWT + group authorization.

**How does import handle duplicates?** It detects duplicates within the upload, checks existing roll numbers, catches unique-constraint races, returns row errors, and only creates valid student/group pairs.

**What survives refresh?** PostgreSQL records for messages, announcements, files, groups, users, and attendance. Typing/presence are process-memory realtime state, so they do not persist.

**What would you improve for production?** See the final section below.

## Part B — Learning guide

### Level 1 — Big picture

Study `frontend/src/pages/ChatPage.jsx` and `backend/src/server.js`. The page is the user workspace; the server mounts APIs, the protected file route, and Socket.IO.

### Level 2 — Frontend

Start at `main.jsx`, `App.jsx`, `routes/AppRouter.jsx`, then `LoginPage.jsx` and `ChatPage.jsx`. `AuthContext.jsx` persists login. `services/` isolates HTTP calls. Components turn page state into announcement/file/attendance/settings UI.

### Level 3 — Backend

Read `server.js`, then a route/controller pair such as `routes/file.routes.js` and `controllers/file.controller.js`. Routes compose middleware; controllers validate, authorize, call Prisma, and return results.

### Level 4 — Database

Read `backend/prisma/schema.prisma`. Focus first on `User`, `Group`, `GroupMember`, `Message`, `Announcement`, and `File`. Follow foreign keys to understand ownership and scopes.

### Level 5 — Authentication/authorization

Study `auth.controller.js`, `auth.middleware.js`, `utils/permissions.js`, and `utils/groupAccess.js`. Notice the difference between verifying a token and checking that its user currently has access to a resource.

### Level 6 — Socket.IO/realtime

Read `frontend/src/sockets/socket.js`, the socket effects in `ChatPage.jsx`, then `backend/src/sockets/chat.socket.js`. Study `joinGroup`, `sendMessage`, `receiveMessage`, and ID deduplication.

### Level 7 — Files

Trace `FileCard.jsx` -> `fileService.downloadFile` -> server `/uploads/:filename` -> `upload.controller.downloadUpload`. For upload, compare Multer validation with the file controller transaction.

### Level 8 — Bulk import/attendance

Study `StudentImportPanel` / `handleStudentImportSubmit`, `adminService.js`, admin route/controller, and `studentImport.service.js`. Then inspect the `loadMembers` effect and attendance controller.

### Level 9 — Complete request lifecycle

Choose one REST operation. Start at component event handler, inspect service URL/body, route middleware order, controller checks, Prisma query, response, then state update. This is the core full-stack debugging method used in this project.

### Level 10 — Production considerations

The code is a useful demonstration of layered responsibilities, but deployment requires operational safeguards beyond its current local architecture.

## Trace these flows yourself

| Exercise | Start here |
| --- | --- |
| Login | `frontend/src/pages/LoginPage.jsx`, then `context/AuthContext.jsx` |
| Send message | `ChatPage.jsx` `handleSendMessage`, then `backend/src/sockets/chat.socket.js` |
| Create announcement | `ChatPage.jsx` `handleCreateAnnouncement`, then `services/announcementService.js` |
| Upload file | `ChatPage.jsx` `handleFileChange`, then `middleware/upload.middleware.js` |
| Download file | `components/FileCard.jsx`, then `services/fileService.js` |
| Update attendance | `ChatPage.jsx` `handleAttendanceSubmit`, then `attendance.controller.js` |
| Import student | `ChatPage.jsx` `handleStudentImportSubmit`, then `studentImport.service.js` |

For each, write down: user input, request/event payload, authorization decision, database operation, server response/event, and React state update. Then compare your trace with the next file in the chain.

## What would need to change for real college production use?

### Currently good for a college project

- PostgreSQL relational model and Prisma migrations.
- bcrypt password hashing; JWT checks on REST and socket connection.
- Group checks on major REST flows and socket joining/sending.
- Upload extension/MIME and size limits, generated disk names, protected downloads.
- Transactional valid import rows with useful row-level results.
- Realtime persistence-before-broadcast design and rebuildable REST state.

### Would need improvement for production

- **Deployment/HTTPS/secrets:** terminate HTTPS, secure/rotate secrets in a secret manager, and use production-specific environment configuration. Current CORS defaults to `*`.
- **Sessions:** localStorage JWTs have XSS exposure; add a refresh-token/session revocation strategy (often secure HttpOnly cookies) and forced logout/rotation.
- **Database operations:** configure backups, restore drills, pooling, migration deployment, and remove/reconcile the currently initialized but otherwise unused raw `pg` pool versus Prisma's `DATABASE_URL` configuration.
- **Files:** replace local disk with object storage (for example S3-compatible storage), malware scanning, lifecycle rules, quotas, and durable metadata/file cleanup.
- **Abuse/security:** add rate limits, security headers, CSRF strategy if cookie auth is adopted, stricter CORS, content inspection, and more comprehensive validation.
- **Observability:** structured logs without secrets, request/error monitoring, uptime checks, metrics, tracing, and audit logs for staff/admin actions.
- **Testing/CI:** add backend unit/integration tests, auth/permission tests, browser realtime tests, lint/test/build CI, and deployment gates. Current package scripts do not provide backend tests/lint.
- **Scaling:** Socket.IO's in-memory presence map and local rooms work on one process only. Multi-instance deployment needs a Socket.IO adapter/pub-sub such as Redis, sticky-session/load-balancer planning, and shared presence design.
- **Product operations:** password reset, email/notification flow, explicit admin/staff lifecycle management, account deactivation, records retention, and accessible error/support workflows.

### Codebase inconsistencies to resolve before production

- Prisma permits `STUDENT`, `TEACHER`, `ADMIN`, while helpers mention `FACULTY`.
- `ProtectedRoute` is present but unused by router.
- `PrivateMessage` and `LeaveRequest` schema models are unimplemented at route/UI level.
- Typing relay validates payload format but does not independently call `getUserGroupAccess`; tighten this before treating typing metadata as fully group-authorized.
